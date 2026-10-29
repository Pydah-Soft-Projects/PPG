const mongoose = require('mongoose');
const { generateAppId } = require('../../common/utils/id');

const applicationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateAppId,
    },
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
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    notificationWebhookUrl: {
      type: String,
      trim: true,
      default: '',
    },
    allowedReturnUrls: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    assignedProviderConfigurations: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;

