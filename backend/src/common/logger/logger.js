const SENSITIVE_KEYS = [
  'password',
  'secret',
  'keysecret',
  'webhooksecret',
  'encryptedkeysecret',
  'encryptedwebhooksecret',
  'authorization',
  'x-app-secret',
  'token',
  'jwt',
  'cardnumber',
  'cvv',
  'pin',
];

function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp,
        message,
        ...redactSensitiveData(meta),
      })
    );
  },
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp,
        message,
        ...redactSensitiveData(meta),
      })
    );
  },
  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp,
        message,
        ...redactSensitiveData(meta),
      })
    );
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'production') return;
    const timestamp = new Date().toISOString();
    console.log(
      JSON.stringify({
        level: 'DEBUG',
        timestamp,
        message,
        ...redactSensitiveData(meta),
      })
    );
  },
};

module.exports = {
  logger,
  redactSensitiveData,
};

