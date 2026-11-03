const AuditLog = require('./auditLog.model');
const logger = require('../../common/logger');

class AuditService {
  /**
   * Logs a security or operational administrative event
   */
  static async record({
    actorType,
    actorId,
    actorEmail = null,
    action,
    targetType,
    targetId,
    details = {},
    req = null,
  }) {
    try {
      const sanitizedDetails = logger.redact(details);

      const entry = await AuditLog.create({
        actorType,
        actorId: actorId ? actorId.toString() : 'unknown',
        actorEmail,
        action,
        targetType,
        targetId: targetId ? targetId.toString() : 'none',
        details: sanitizedDetails,
        ipAddress: req ? req.ip || req.headers['x-forwarded-for'] : null,
        userAgent: req ? req.headers['user-agent'] : null,
        requestId: req ? req.id : null,
      });

      logger.info(`[AUDIT] ${action} on ${targetType}:${targetId} by ${actorType}:${actorId}`);
      return entry;
    } catch (err) {
      logger.error('Failed to write audit log entry', { error: err.message, action });
      // Non-blocking so business transactions do not fail if audit DB hiccups
      return null;
    }
  }
}

module.exports = AuditService;

