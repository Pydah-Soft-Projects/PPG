const mongoose = require('mongoose');
const { generateWebhookEventId } = require('../../common/utils/id');

const webhookEventSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateWebhookEventId,
    },
    provider: {
      type: String,
      required: true,
      default: 'RAZORPAY',
    },
    providerConfigurationId: {
      type: String,
      required: true,
      index: true,
      ref: 'ProviderConfiguration',
    },
    providerEventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    signatureVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    processingStatus: {
      type: String,
      enum: ['PROCESSED', 'IGNORED', 'FAILED'],
      default: 'PROCESSED',
      index: true,
    },
    error: {
      type: String,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// Webhook deduplication: providerConfigurationId + providerEventId must be unique
webhookEventSchema.index(
  { providerConfigurationId: 1, providerEventId: 1 },
  { unique: true }
);

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

module.exports = WebhookEvent;

