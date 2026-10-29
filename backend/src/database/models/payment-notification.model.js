const mongoose = require('mongoose');
const { NOTIFICATION_STATUS } = require('../../config/constants');
const { generateNotificationId } = require('../../common/utils/id');

const paymentNotificationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateNotificationId,
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
    eventType: {
      type: String,
      required: true,
    },
    destinationUrl: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      default: NOTIFICATION_STATUS.PENDING,
      index: true,
    },
    attemptsCount: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
    nextRetryAt: {
      type: Date,
    },
    responseStatus: {
      type: Number,
    },
    responseBody: {
      type: String,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

paymentNotificationSchema.index({ status: 1, nextRetryAt: 1 });

const PaymentNotification = mongoose.model('PaymentNotification', paymentNotificationSchema);

module.exports = PaymentNotification;

