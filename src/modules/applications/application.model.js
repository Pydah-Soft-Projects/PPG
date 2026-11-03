const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
      default: 'ACTIVE',
      index: true,
    },
    notificationUrl: {
      type: String,
      trim: true,
      default: null,
    },
    allowedOrigins: {
      type: [String],
      default: [],
    },
    defaultProviderEnvironment: {
      type: String,
      enum: ['TEST', 'LIVE'],
      default: 'TEST',
    },
    createdBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Application', applicationSchema);

