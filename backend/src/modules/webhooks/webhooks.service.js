const WebhookEvent = require('../../database/models/webhook-event.model');
const PaymentTransaction = require('../../database/models/payment-transaction.model');
const PaymentAttempt = require('../../database/models/payment-attempt.model');
const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const providerConfigurationsService = require('../provider-configurations/provider-configurations.service');
const { getProviderAdapter } = require('../providers/provider.factory');
const notificationsService = require('../notifications/notifications.service');
const { PAYMENT_STATUS, ALLOWED_STATUS_TRANSITIONS } = require('../../config/constants');
const AppError = require('../../common/errors/app-error');
const ERROR_CODES = require('../../common/errors/error-codes');
const { logger } = require('../../common/logger/logger');

function isValidTransition(current, target) {
  if (current === target) return true;
  const next = ALLOWED_STATUS_TRANSITIONS[current] || [];
  return next.includes(target);
}

class WebhooksService {
  async handleRazorpayWebhook({ providerConfigurationId, rawBody, signature, payload }) {
    // 1. Resolve Provider Configuration
    const config = await ProviderConfiguration.findById(providerConfigurationId);
    if (!config) {
      throw AppError.notFound(
        `Provider configuration '${providerConfigurationId}' not found`,
        ERROR_CODES.NOT_FOUND
      );
    }

    const credentials = providerConfigurationsService.getDecryptedCredentials(config);
    const adapter = getProviderAdapter(config.provider);

    // 2. Cryptographic Signature Verification
    const isSignatureValid = await adapter.verifyWebhookSignature({
      rawBody,
      signature,
      credentials,
    });

    if (!isSignatureValid) {
      logger.warn('Invalid Razorpay webhook signature rejected', {
        providerConfigurationId,
      });
      throw AppError.badRequest(
        'Invalid webhook signature',
        ERROR_CODES.INVALID_SIGNATURE
      );
    }

    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event;

    // 3. Deduplication Check
    const existingEvent = await WebhookEvent.findOne({
      providerConfigurationId: config._id,
      providerEventId: eventId,
    });

    if (existingEvent) {
      logger.info('Duplicate webhook event detected and acknowledged', {
        eventId,
        providerConfigurationId: config._id,
      });
      return { received: true, deduplicated: true };
    }

    // 4. Persist Webhook Event
    const eventRecord = await WebhookEvent.create({
      provider: config.provider,
      providerConfigurationId: config._id,
      providerEventId: eventId,
      eventType,
      signatureVerified: true,
      payload,
      processingStatus: 'PROCESSED',
    });

    // 5. Process Specific Event Types
    try {
      await this.processEventPayload({ config, eventType, payload });
    } catch (err) {
      logger.error('Error during webhook event processing', {
        error: err.message,
        eventId,
        eventType,
      });
      eventRecord.processingStatus = 'FAILED';
      eventRecord.error = err.message;
      await eventRecord.save();
    }

    return { received: true, eventId };
  }

  async processEventPayload({ config, eventType, payload }) {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const providerOrderId = paymentEntity?.order_id || orderEntity?.id;
    const providerPaymentId = paymentEntity?.id;

    if (!providerOrderId && !providerPaymentId) {
      logger.info('Webhook event contains no order or payment references, ignoring', {
        eventType,
      });
      return;
    }

    // Match transaction by providerOrderId or notes
    let transaction = await PaymentTransaction.findOne({
      $or: [
        { providerOrderId },
        { providerPaymentId },
        { _id: paymentEntity?.notes?.paymentId },
      ],
    });

    if (!transaction) {
      logger.warn('No matching internal payment found for webhook', {
        providerOrderId,
        providerPaymentId,
        eventType,
      });
      return;
    }

    // Ensure account matches
    if (transaction.providerConfigurationId !== config._id) {
      logger.error('Provider configuration mismatch for payment webhook!', {
        paymentConfig: transaction.providerConfigurationId,
        webhookConfig: config._id,
      });
      return;
    }

    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        // Validate amount and currency
        if (paymentEntity) {
          if (paymentEntity.amount !== transaction.amount) {
            logger.error('Amount mismatch on webhook capture!', {
              expected: transaction.amount,
              received: paymentEntity.amount,
            });
            throw AppError.badRequest(
              'Webhook payment amount does not match transaction amount',
              ERROR_CODES.AMOUNT_MISMATCH
            );
          }
          if (paymentEntity.currency !== transaction.currency) {
            logger.error('Currency mismatch on webhook capture!', {
              expected: transaction.currency,
              received: paymentEntity.currency,
            });
            throw AppError.badRequest('Webhook payment currency does not match');
          }
        }

        if (isValidTransition(transaction.status, PAYMENT_STATUS.SUCCEEDED)) {
          transaction.status = PAYMENT_STATUS.SUCCEEDED;
          if (providerPaymentId) transaction.providerPaymentId = providerPaymentId;
          transaction.paidAt = new Date();
          await transaction.save();

          await PaymentAttempt.create({
            paymentId: transaction._id,
            attemptNumber: 3,
            provider: config.provider,
            providerOrderId,
            providerPaymentId,
            status: 'WEBHOOK_SUCCEEDED',
            responsePayload: payload,
          });

          // Dispatch notification to calling application
          notificationsService.notifyPaymentEvent(transaction, 'payment.succeeded').catch((err) => {
            logger.error('Webhook notification dispatch failed', { error: err.message });
          });
        }
        break;
      }

      case 'payment.failed': {
        if (isValidTransition(transaction.status, PAYMENT_STATUS.FAILED)) {
          transaction.status = PAYMENT_STATUS.FAILED;
          transaction.failedAt = new Date();
          transaction.failureReason = paymentEntity?.error_description || 'Payment failed';
          await transaction.save();

          await PaymentAttempt.create({
            paymentId: transaction._id,
            attemptNumber: 3,
            provider: config.provider,
            providerOrderId,
            providerPaymentId,
            status: 'WEBHOOK_FAILED',
            responsePayload: payload,
          });

          notificationsService.notifyPaymentEvent(transaction, 'payment.failed').catch((err) => {
            logger.error('Webhook notification dispatch failed', { error: err.message });
          });
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event type: ${eventType}`);
        break;
    }
  }

  async handleCashfreeWebhook({ providerConfigurationId, rawBody, signature, headers, payload }) {
    const config = await ProviderConfiguration.findById(providerConfigurationId);
    if (!config) {
      throw AppError.notFound(`Provider configuration '${providerConfigurationId}' not found`);
    }

    const credentials = providerConfigurationsService.getDecryptedCredentials(config);
    const adapter = getProviderAdapter(config.provider);

    const isSignatureValid = await adapter.verifyWebhookSignature({
      rawBody,
      signature,
      credentials,
      headers,
    });

    if (!isSignatureValid) {
      logger.warn('Invalid Cashfree webhook signature rejected', { providerConfigurationId });
      throw AppError.badRequest('Invalid Cashfree webhook signature', ERROR_CODES.INVALID_SIGNATURE);
    }

    const eventType = payload.type || payload.event || 'PAYMENT_SUCCESS_WEBHOOK';
    const orderData = payload.data?.order || {};
    const paymentData = payload.data?.payment || {};
    const providerOrderId = orderData.order_id || payload.orderId;
    const providerPaymentId = String(paymentData.cf_payment_id || paymentData.payment_id || '');

    if (!providerOrderId) {
      logger.info('Cashfree webhook missing order reference, ignoring', { eventType });
      return { received: true };
    }

    let transaction = await PaymentTransaction.findOne({
      $or: [
        { providerOrderId },
        { _id: providerOrderId },
      ],
    });

    if (!transaction) {
      logger.warn('No matching payment transaction found for Cashfree webhook', { providerOrderId });
      return { received: true };
    }

    const isSuccess =
      paymentData.payment_status === 'SUCCESS' ||
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID_SUCCESS';

    if (isSuccess && isValidTransition(transaction.status, PAYMENT_STATUS.SUCCEEDED)) {
      transaction.status = PAYMENT_STATUS.SUCCEEDED;
      transaction.providerPaymentId = providerPaymentId;
      transaction.paidAt = new Date();
      await transaction.save();

      logger.info('Cashfree payment marked SUCCEEDED via webhook', {
        paymentId: transaction._id,
        providerOrderId,
        providerPaymentId,
      });

      notificationsService.notifyPaymentEvent(transaction, 'payment.succeeded').catch((err) => {
        logger.error('Cashfree notification dispatch failed', { error: err.message });
      });
    }

    return { received: true };
  }
}

module.exports = new WebhooksService();

