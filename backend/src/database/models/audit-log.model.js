const mongoose = require('mongoose');
const { AUDIT_ACTION } = require('../../config/constants');
const { generateAuditLogId } = require('../../common/utils/id');

const auditLogSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateAuditLogId,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTION),
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['ADMIN', 'APPLICATION', 'SYSTEM'],
      required: true,
    },
    actorId: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    _id: false,
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

