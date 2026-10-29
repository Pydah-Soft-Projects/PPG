const crypto = require('crypto');

/**
 * Generates a cryptographically random prefixed identifier
 * @param {string} prefix
 * @param {number} [length=16]
 * @returns {string}
 */
function generateId(prefix, length = 16) {
  const random = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  return `${prefix}_${random}`;
}

module.exports = {
  generateId,
  generatePaymentId: () => generateId('pay', 16),
  generateAttemptId: () => generateId('att', 16),
  generateAppId: () => generateId('app', 16),
  generateAppKeyId: () => generateId('key', 20),
  generateAppSecret: () => `sec_${crypto.randomBytes(24).toString('hex')}`,
  generateRefundId: () => generateId('ref', 16),
  generateNotificationId: () => generateId('notif', 16),
  generateWebhookEventId: () => generateId('evt', 16),
  generateProviderConfigId: () => generateId('pcfg', 16),
  generateAdminUserId: () => generateId('usr', 16),
  generateAuditLogId: () => generateId('aud', 16),
};

