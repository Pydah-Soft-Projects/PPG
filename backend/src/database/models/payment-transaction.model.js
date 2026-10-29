const mongoose = require('mongoose');
const { PAYMENT_STATUS, PROVIDER_TYPE } = require('../../config/constants');
const { generatePaymentId } = require('../../common/utils/id');

const paymentTransactionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generatePaymentId,
    },
    applicationId: {
      type: String,
      required: true,
      index: true,
      ref: 'Application',
    },
    businessReference: {
      type: String,
      required: true,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    payloadFingerprint: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value in minor units (paise).',
      },
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(PROVIDER_TYPE),
      default: PROVIDER_TYPE.RAZORPAY,
    },
    providerConfigurationId: {
      type: String,
      required: true,
      ref: 'ProviderConfiguration',
      index: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      index: true,
    },
    providerSignature: {
      type: String,
      trim: true,
    },
    customer: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: Map,
      of: String,
      default: {},
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// Idempotency: Unique payment per application + idempotencyKey
paymentTransactionSchema.index({ applicationId: 1, idempotencyKey: 1 }, { unique: true });

// Business reference index scoped to application
paymentTransactionSchema.index({ applicationId: 1, businessReference: 1 });

// Query indexes
paymentTransactionSchema.index({ status: 1, createdAt: -1 });
paymentTransactionSchema.index({ providerConfigurationId: 1, status: 1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = PaymentTransaction;

