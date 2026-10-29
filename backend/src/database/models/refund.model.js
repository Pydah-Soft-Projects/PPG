const mongoose = require('mongoose');
const { REFUND_STATUS } = require('../../config/constants');
const { generateRefundId } = require('../../common/utils/id');

const refundSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateRefundId,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
      ref: 'PaymentTransaction',
    },
    applicationId: {
      type: String,
      required: true,
      index: true,
      ref: 'Application',
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
      default: 'INR',
    },
    provider: {
      type: String,
      required: true,
    },
    providerRefundId: {
      type: String,
      trim: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    requestedBy: {
      type: String,
      default: 'APPLICATION',
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

refundSchema.index({ paymentId: 1, idempotencyKey: 1 });

const Refund = mongoose.model('Refund', refundSchema);

module.exports = Refund;

