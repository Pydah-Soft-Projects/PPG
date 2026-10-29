const PaymentTransaction = require('../../database/models/payment-transaction.model');
const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const providerConfigurationsService = require('../provider-configurations/provider-configurations.service');
const { getProviderAdapter } = require('../providers/provider.factory');
const notificationsService = require('../notifications/notifications.service');
const auditService = require('../audit/audit.service');
const { PAYMENT_STATUS, AUDIT_ACTION } = require('../../config/constants');
const AppError = require('../../common/errors/app-error');
const { logger } = require('../../common/logger/logger');

class ReconciliationService {
  /**
   * Finds pending transactions older than 15 minutes that require status reconciliation
   */
  async findExceptions() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const pendingStuck = await PaymentTransaction.find({
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
      createdAt: { $lt: fifteenMinutesAgo },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return {
      pendingExceptionsCount: pendingStuck.length,
      exceptions: pendingStuck,
    };
  }

  /**
   * Authoritatively queries the provider to synchronize transaction state
   */
  async syncTransactionWithProvider(paymentId, actorContext = {}) {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    if (!payment.providerPaymentId && !payment.providerOrderId) {
      throw AppError.badRequest('Payment lacks provider reference to query status');
    }

    const config = await ProviderConfiguration.findById(payment.providerConfigurationId);
    if (!config) {
      throw AppError.internal('Provider configuration not found');
    }

    const credentials = providerConfigurationsService.getDecryptedCredentials(config);
    const adapter = getProviderAdapter(payment.provider);

    let providerDetails;
    try {
      if (payment.providerPaymentId) {
        providerDetails = await adapter.getPaymentDetails({
          providerPaymentId: payment.providerPaymentId,
          credentials,
        });
      } else {
        return {
          payment,
          message: 'Payment has orderId but no provider payment id completed yet',
          synced: false,
        };
      }
    } catch (err) {
      logger.error('Provider sync query failed', { error: err.message, paymentId });
      throw err;
    }

    const oldStatus = payment.status;
    let newStatus = oldStatus;

    if (providerDetails.status === 'captured') {
      newStatus = PAYMENT_STATUS.SUCCEEDED;
      payment.paidAt = payment.paidAt || new Date();
    } else if (providerDetails.status === 'failed') {
      newStatus = PAYMENT_STATUS.FAILED;
      payment.failedAt = payment.failedAt || new Date();
    }

    if (oldStatus !== newStatus) {
      payment.status = newStatus;
      await payment.save();

      await auditService.log({
        action: AUDIT_ACTION.PAYMENT_MANUAL_SYNC,
        actorType: 'ADMIN',
        actorId: actorContext.actorId || 'SYSTEM',
        targetType: 'PAYMENT',
        targetId: payment._id,
        ipAddress: actorContext.ip,
        userAgent: actorContext.userAgent,
        metadata: { oldStatus, newStatus, providerStatus: providerDetails.status },
      });

      // Dispatch notification
      notificationsService.notifyPaymentEvent(payment, `payment.${newStatus.toLowerCase()}`).catch((e) => {
        logger.error('Sync notification error', { error: e.message });
      });
    }

    return {
      payment,
      synced: true,
      oldStatus,
      newStatus,
      providerDetails,
    };
  }
}

module.exports = new ReconciliationService();

