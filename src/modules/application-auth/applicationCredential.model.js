const mongoose = require('mongoose');

const applicationCredentialSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    appKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    secretHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    label: {
      type: String,
      default: 'Primary Key',
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ApplicationCredential', applicationCredentialSchema);

