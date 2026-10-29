const mongoose = require('mongoose');
const { PROVIDER_TYPE, PROVIDER_ENVIRONMENT } = require('../../config/constants');
const { generateProviderConfigId } = require('../../common/utils/id');
const { maskKeyId } = require('../../common/utils/crypto');

const encryptedPayloadSchema = new mongoose.Schema(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    keyVersion: { type: Number, default: 1 },
  },
  { _id: false }
);

const providerConfigurationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateProviderConfigId,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    provider: {
      type: String,
      enum: Object.values(PROVIDER_TYPE),
      default: PROVIDER_TYPE.RAZORPAY,
    },
    environment: {
      type: String,
      enum: Object.values(PROVIDER_ENVIRONMENT),
      default: PROVIDER_ENVIRONMENT.TEST,
    },
    keyId: {
      type: String,
      required: true,
      trim: true,
    },
    encryptedKeySecret: {
      type: encryptedPayloadSchema,
      required: true,
    },
    encryptedWebhookSecret: {
      type: encryptedPayloadSchema,
      required: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    allowedApplicationIds: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    lastCredentialRotationAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      default: 'SYSTEM',
    },
    updatedBy: {
      type: String,
      default: 'SYSTEM',
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

providerConfigurationSchema.index({ provider: 1, environment: 1, status: 1 });

/**
 * Returns a safe representation of the provider config with masked keys
 * and completely omitting encrypted secret payloads.
 */
providerConfigurationSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    id: this._id,
    name: this.name,
    accountNumber: this.accountNumber || '',
    provider: this.provider,
    environment: this.environment,
    keyId: this.keyId,
    maskedKeyId: maskKeyId(this.keyId),
    hasKeySecret: Boolean(this.encryptedKeySecret && this.encryptedKeySecret.ciphertext),
    hasWebhookSecret: Boolean(this.encryptedWebhookSecret && this.encryptedWebhookSecret.ciphertext),
    status: this.status,
    allowedApplicationIds: this.allowedApplicationIds,
    notes: this.notes,
    lastCredentialRotationAt: this.lastCredentialRotationAt,
    createdBy: this.createdBy,
    updatedBy: this.updatedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const ProviderConfiguration = mongoose.model(
  'ProviderConfiguration',
  providerConfigurationSchema
);

module.exports = ProviderConfiguration;

