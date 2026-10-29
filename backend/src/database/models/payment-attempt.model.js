const mongoose = require('mongoose');
const { generateAttemptId } = require('../../common/utils/id');

const paymentAttemptSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateAttemptId,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
      ref: 'PaymentTransaction',
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    provider: {
      type: String,
      required: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    _id: false,
  }
);

paymentAttemptSchema.index({ paymentId: 1, attemptNumber: 1 });

const PaymentAttempt = mongoose.model('PaymentAttempt', paymentAttemptSchema);

module.exports = PaymentAttempt;

