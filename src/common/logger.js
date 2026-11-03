const config = require('../config');

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'keysecret',
  'webhooksecret',
  'appsecret',
  'authorization',
  'x-app-secret',
  'encryptedkeysecret',
  'encryptedwebhooksecret',
]);

function redact(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redact(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level, message, meta = {}) {
  // Suppress verbose logs in test environment unless enabled
  if (config.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) {
    return;
  }

  const logPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  };

  const output = JSON.stringify(logPayload);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

const logger = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
  redact,
};

module.exports = logger;

