const AuditLog = require('../../database/models/audit-log.model');
const { logger } = require('../../common/logger/logger');

class AuditService {
  /**
   * Logs an audit event
   */
  async log({ action, actorType, actorId, targetType, targetId, ipAddress, userAgent, metadata }) {
    try {
      const entry = await AuditLog.create({
        action,
        actorType,
        actorId,
        targetType,
        targetId,
        ipAddress,
        userAgent,
        metadata,
      });
      return entry;
    } catch (err) {
      logger.error('Failed to write audit log entry', { error: err.message, action });
      return null;
    }
  }

  /**
   * Queries audit logs with pagination and filters
   */
  async listLogs({ action, actorId, targetId, limit = 50, page = 1 }) {
    const filter = {};
    if (action) filter.action = action;
    if (actorId) filter.actorId = actorId;
    if (targetId) filter.targetId = targetId;

    const skip = (Math.max(1, page) - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AuditService();

