const mongoose = require('mongoose');
const { generateAppKeyId } = require('../../common/utils/id');

const applicationCredentialSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `cred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    },
    applicationId: {
      type: String,
      required: true,
      index: true,
      ref: 'Application',
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
      default: generateAppKeyId,
    },
    hashedSecret: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
    },
    lastUsedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

applicationCredentialSchema.index({ applicationId: 1, status: 1 });

const ApplicationCredential = mongoose.model('ApplicationCredential', applicationCredentialSchema);

module.exports = ApplicationCredential;

