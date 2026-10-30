const crypto = require('crypto');
const PaymentTransaction = require('../../database/models/payment-transaction.model');
const PaymentAttempt = require('../../database/models/payment-attempt.model');
const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const Application = require('../../database/models/application.model');
const { getProviderAdapter } = require('../providers/provider.factory');
const providerConfigurationsService = require('../provider-configurations/provider-configurations.service');
const collegesService = require('../colleges/colleges.service');
const notificationsService = require('../notifications/notifications.service');
const {
  PAYMENT_STATUS,
  ALLOWED_STATUS_TRANSITIONS,
  PROVIDER_ENVIRONMENT,
} = require('../../config/constants');
const { validateMinorUnits } = require('../../common/utils/amount');
const { generatePaymentId, generateId } = require('../../common/utils/id');
const AppError = require('../../common/errors/app-error');
const ERROR_CODES = require('../../common/errors/error-codes');
const { logger } = require('../../common/logger/logger');

function computePayloadFingerprint(data) {
  const normalized = {
    amount: data.amount,
    currency: (data.currency || 'INR').toUpperCase(),
    businessReference: data.businessReference,
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function isValidStatusTransition(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) return true;
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(targetStatus);
}

class PaymentsService {
  /**
   * Creates or idempotently retrieves a payment order
   */
  async createPayment({ application, data, idempotencyKeyHeader }) {
    const amount = validateMinorUnits(data.amount);
    const currency = (data.currency || 'INR').toUpperCase();
    const idempotencyKey = data.idempotencyKey || idempotencyKeyHeader || generateId('idemp', 16);
    const fingerprint = computePayloadFingerprint({
      amount,
      currency,
      businessReference: data.businessReference,
    });

    // 1. Idempotency Check
    const existing = await PaymentTransaction.findOne({
      applicationId: application._id,
      idempotencyKey,
    });

    if (existing) {
      if (existing.payloadFingerprint !== fingerprint) {
        throw AppError.conflict(
          'Idempotency key already used with different payment parameters',
          ERROR_CODES.IDEMPOTENCY_CONFLICT,
          {
            idempotencyKey,
            existingReference: existing.businessReference,
          }
        );
      }

      logger.info('Returning existing idempotent payment', {
        paymentId: existing._id,
        applicationId: application._id,
      });

      return {
        payment: existing,
        isIdempotentReplay: true,
        checkoutUrl: `/checkout/${existing._id}`,
      };
    }

    // 2. Resolve Dynamic College/Course Routing & Provider Configuration
    const collegeIdentifier =
      data.collegeCode ||
      (typeof data.college === 'object' ? data.college?.code || data.college?.id : data.college) ||
      data.collegeId;
    const courseIdentifier =
      data.courseCode ||
      (typeof data.course === 'object' ? data.course?.code || data.course?.id : data.course) ||
      data.courseId;

    let resolvedCollegeMeta = null;
    let resolvedCourseMeta = null;
    let resolvedProviderConfigId = data.providerConfigurationId;

    if (collegeIdentifier) {
      const routingResult = await collegesService.resolveProviderConfiguration({
        applicationId: application._id,
        collegeIdentifier,
        courseIdentifier,
      });

      if (routingResult) {
        if (routingResult.courseRoutingMissing) {
          throw AppError.badRequest(
            `No payment account configured for course '${courseIdentifier}'. Payments cannot proceed without a dedicated course account.`,
            ERROR_CODES.PROVIDER_UNAVAILABLE
          );
        }

        if (!resolvedProviderConfigId && routingResult.providerConfigurationId) {
          resolvedProviderConfigId = routingResult.providerConfigurationId;
        }
        resolvedCollegeMeta = routingResult.college;
        resolvedCourseMeta = routingResult.course;
      }
    }

    let providerConfig;
    if (resolvedProviderConfigId) {
      providerConfig = await ProviderConfiguration.findOne({
        _id: resolvedProviderConfigId,
        status: 'ACTIVE',
      });
    }

    if (!providerConfig) {
      // Find first enabled provider config matching application
      providerConfig = await ProviderConfiguration.findOne({
        status: 'ACTIVE',
        $or: [
          { allowedApplicationIds: application._id },
          { _id: { $in: application.assignedProviderConfigurations || [] } },
        ],
      });
    }

    if (!providerConfig) {
      // Fallback: check any active TEST configuration
      providerConfig = await ProviderConfiguration.findOne({
        status: 'ACTIVE',
        environment: PROVIDER_ENVIRONMENT.TEST,
      });
    }

    if (!providerConfig) {
      throw AppError.badRequest(
        'No active payment provider configuration available for this application. Please configure a provider in the admin console.',
        ERROR_CODES.PROVIDER_UNAVAILABLE
      );
    }

    const credentials = providerConfigurationsService.getDecryptedCredentials(providerConfig);
    const adapter = getProviderAdapter(providerConfig.provider);

    const paymentId = generatePaymentId();

    // 3. Create Provider Order
    let providerOrderResult;
    try {
      providerOrderResult = await adapter.createOrder({
        orderData: {
          amount,
          currency,
          receipt: paymentId,
          customer: data.customer || {},
          notes: {
            paymentId,
            applicationId: application._id,
            businessReference: data.businessReference,
            returnUrl: data.returnUrl || application.allowedReturnUrls?.[0] || '',
            ...(data.notes || {}),
          },
        },
        credentials,
      });
    } catch (err) {
      logger.error('Failed to create order with provider adapter', {
        error: err.message,
        paymentId,
        provider: providerConfig.provider,
      });
      throw err;
    }

    // 4. Save Payment Transaction
    const transaction = await PaymentTransaction.create({
      _id: paymentId,
      applicationId: application._id,
      businessReference: data.businessReference,
      idempotencyKey,
      payloadFingerprint: fingerprint,
      amount,
      currency,
      status: PAYMENT_STATUS.CREATED,
      provider: providerConfig.provider,
      providerConfigurationId: providerConfig._id,
      providerOrderId: providerOrderResult.orderId,
      paymentSessionId: providerOrderResult.paymentSessionId || null,
      customer: data.customer || {},
      college: resolvedCollegeMeta || (collegeIdentifier ? { code: String(collegeIdentifier) } : undefined),
      course: resolvedCourseMeta || (courseIdentifier ? { code: String(courseIdentifier) } : undefined),
      description: data.description || '',
      notes: data.notes || {},
      returnUrl: data.returnUrl || application.allowedReturnUrls?.[0] || '',
    });

    // 5. Save Initial Attempt
    await PaymentAttempt.create({
      paymentId: transaction._id,
      attemptNumber: 1,
      provider: providerConfig.provider,
      providerOrderId: providerOrderResult.orderId,
      status: 'ORDER_CREATED',
      requestPayload: { amount, currency, receipt: paymentId },
      responsePayload: providerOrderResult.rawResponse,
    });

    // 6. Return response with safe checkout configuration (No secrets exposed)
    return {
      payment: transaction,
      isIdempotentReplay: false,
      checkoutUrl: `/checkout/${transaction._id}`,
      checkout: {
        keyId: providerConfig.keyId,
        orderId: providerOrderResult.orderId,
        paymentSessionId: providerOrderResult.paymentSessionId || null,
        amount,
        currency,
        name: application.name,
        description: data.description || '',
        prefill: {
          name: data.customer?.name || '',
          email: data.customer?.email || '',
          contact: data.customer?.phone || '',
        },
      },
    };
  }

  /**
   * Verifies payment result after checkout
   */
  async verifyPayment({ application, paymentId, verificationData }) {
    const payment = await PaymentTransaction.findOne({
      _id: paymentId,
      applicationId: application._id,
    });

    if (!payment) {
      throw AppError.notFound('Payment transaction not found for this application');
    }

    // If already succeeded, return immediately
    if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
      return payment;
    }

    if (!isValidStatusTransition(payment.status, PAYMENT_STATUS.SUCCEEDED)) {
      throw AppError.badRequest(
        `Cannot transition payment status from '${payment.status}' to 'SUCCEEDED'`,
        ERROR_CODES.INVALID_STATE_TRANSITION
      );
    }

    const providerConfig = await ProviderConfiguration.findById(payment.providerConfigurationId);
    if (!providerConfig) {
      throw AppError.internal('Provider configuration missing for payment');
    }

    const credentials = providerConfigurationsService.getDecryptedCredentials(providerConfig);
    const adapter = getProviderAdapter(payment.provider);

    const isValid = await adapter.verifyPaymentSignature({
      paymentData: {
        orderId: verificationData.razorpayOrderId || payment.providerOrderId,
        paymentId: verificationData.razorpayPaymentId,
        signature: verificationData.razorpaySignature,
      },
      credentials,
    });

    if (!isValid) {
      await PaymentAttempt.create({
        paymentId: payment._id,
        attemptNumber: 2,
        provider: payment.provider,
        providerOrderId: verificationData.razorpayOrderId,
        providerPaymentId: verificationData.razorpayPaymentId,
        status: 'VERIFICATION_FAILED',
      });

      throw AppError.badRequest(
        'Cryptographic payment signature verification failed',
        ERROR_CODES.INVALID_SIGNATURE
      );
    }

    // Payment signature is valid -> mark SUCCEEDED
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.providerPaymentId = verificationData.razorpayPaymentId;
    payment.providerSignature = verificationData.razorpaySignature;
    payment.paidAt = new Date();
    await payment.save();

    await PaymentAttempt.create({
      paymentId: payment._id,
      attemptNumber: 2,
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: verificationData.razorpayPaymentId,
      status: 'SUCCEEDED',
    });

    // Notify calling application asynchronously
    notificationsService.notifyPaymentEvent(payment, 'payment.succeeded').catch((err) => {
      logger.error('Background notification dispatch failed', { error: err.message });
    });

    return payment;
  }

  /**
   * Retrieves single payment for authenticated application
   */
  async getPaymentById({ application, paymentId }) {
    const payment = await PaymentTransaction.findOne({
      _id: paymentId,
      applicationId: application._id,
    });

    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    return payment;
  }
}

module.exports = new PaymentsService();

