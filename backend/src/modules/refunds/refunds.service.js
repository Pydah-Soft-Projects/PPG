const PaymentTransaction = require('../../database/models/payment-transaction.model');
const Refund = require('../../database/models/refund.model');
const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const providerConfigurationsService = require('../provider-configurations/provider-configurations.service');
const { getProviderAdapter } = require('../providers/provider.factory');
const notificationsService = require('../notifications/notifications.service');
const auditService = require('../audit/audit.service');
const {
  PAYMENT_STATUS,
  REFUND_STATUS,
  AUDIT_ACTION,
} = require('../../config/constants');
const { validateMinorUnits } = require('../../common/utils/amount');
const { generateRefundId, generateId } = require('../../common/utils/id');
const AppError = require('../../common/errors/app-error');
const ERROR_CODES = require('../../common/errors/error-codes');
const { logger } = require('../../common/logger/logger');

class RefundsService {
  async requestRefund({ paymentId, amount: rawAmount, reason, idempotencyKey: rawIdempKey, requestedBy = 'APPLICATION', actorContext = {} }) {
    const amount = validateMinorUnits(rawAmount);
    const idempotencyKey = rawIdempKey || generateId('idemp_ref', 16);

    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    if (
      payment.status !== PAYMENT_STATUS.SUCCEEDED &&
      payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED
    ) {
      throw AppError.badRequest(
        `Refund cannot be processed for payment with status '${payment.status}'. Only SUCCEEDED payments are refundable.`,
        ERROR_CODES.INVALID_STATE_TRANSITION
      );
    }

    if (!payment.providerPaymentId) {
      throw AppError.badRequest('Payment does not have an authoritative provider payment ID');
    }

    // Check refund ceiling
    const totalRefundedSoFar = payment.refundedAmount || 0;
    const remainingRefundable = payment.amount - totalRefundedSoFar;

    if (amount > remainingRefundable) {
      throw AppError.badRequest(
        `Requested refund amount (${amount} paise) exceeds remaining refundable balance (${remainingRefundable} paise)`,
        ERROR_CODES.AMOUNT_MISMATCH
      );
    }

    // Idempotency check
    const existingRefund = await Refund.findOne({ paymentId, idempotencyKey });
    if (existingRefund) {
      return existingRefund;
    }

    const providerConfig = await ProviderConfiguration.findById(payment.providerConfigurationId);
    if (!providerConfig) {
      throw AppError.internal('Provider configuration missing for payment');
    }

    const credentials = providerConfigurationsService.getDecryptedCredentials(providerConfig);
    const adapter = getProviderAdapter(payment.provider);

    const refundId = generateRefundId();

    let providerResult;
    try {
      providerResult = await adapter.refundPayment({
        refundData: {
          paymentId: payment.providerPaymentId,
          amount,
          reason,
          notes: {
            refundId,
            paymentId: payment._id,
          },
        },
        credentials,
      });
    } catch (err) {
      await Refund.create({
        _id: refundId,
        paymentId: payment._id,
        applicationId: payment.applicationId,
        amount,
        currency: payment.currency,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        reason,
        status: REFUND_STATUS.FAILED,
        idempotencyKey,
        requestedBy,
        error: err.message,
      });
      throw err;
    }

    const refund = await Refund.create({
      _id: refundId,
      paymentId: payment._id,
      applicationId: payment.applicationId,
      amount,
      currency: payment.currency,
      provider: payment.provider,
      providerRefundId: providerResult.refundId,
      providerPaymentId: payment.providerPaymentId,
      reason,
      status: REFUND_STATUS.SUCCEEDED,
      idempotencyKey,
      requestedBy,
    });

    // Update payment record
    payment.refundedAmount = totalRefundedSoFar + amount;
    payment.status =
      payment.refundedAmount >= payment.amount
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.PARTIALLY_REFUNDED;

    await payment.save();

    await auditService.log({
      action: AUDIT_ACTION.REFUND_REQUESTED,
      actorType: requestedBy === 'ADMIN' ? 'ADMIN' : 'APPLICATION',
      actorId: actorContext.actorId || payment.applicationId,
      targetType: 'PAYMENT',
      targetId: payment._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: { refundId: refund._id, amount, status: refund.status },
    });

    // Notify calling application
    notificationsService
      .notifyPaymentEvent(payment, 'payment.refunded')
      .catch((err) => logger.error('Refund notification dispatch error', { error: err.message }));

    return refund;
  }

  async listRefunds({ paymentId, applicationId, page = 1, limit = 50 }) {
    const filter = {};
    if (paymentId) filter.paymentId = paymentId;
    if (applicationId) filter.applicationId = applicationId;

    const skip = (Math.max(1, page) - 1) * limit;

    const [refunds, total] = await Promise.all([
      Refund.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Refund.countDocuments(filter),
    ]);

    return {
      refunds,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new RefundsService();

