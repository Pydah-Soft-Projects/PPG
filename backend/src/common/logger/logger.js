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

const isProduction = process.env.NODE_ENV === 'production' && process.env.LOG_FORMAT !== 'pretty';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

function formatConsoleTime() {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:MM:SS
}

function printDevLog(level, message, meta = {}) {
  const time = formatConsoleTime();
  const sanitizedMeta = redactSensitiveData(meta);

  // If this is an HTTP request log
  if (sanitizedMeta.method && sanitizedMeta.path) {
    const code = sanitizedMeta.statusCode || 200;
    const method = sanitizedMeta.method.padEnd(6, ' ');
    const path = sanitizedMeta.path;
    const duration = sanitizedMeta.durationMs ? `${sanitizedMeta.durationMs}ms` : '';

    let statusColor = colors.green;
    let icon = '✔';

    if (code >= 500) {
      statusColor = colors.red;
      icon = '✖';
    } else if (code >= 400) {
      statusColor = colors.yellow;
      icon = '⚠';
    } else if (code >= 300) {
      statusColor = colors.cyan;
      icon = '↪';
    }

    const errorSuffix = sanitizedMeta.errorMessage ? ` ${colors.yellow}→ ${sanitizedMeta.errorMessage}${colors.reset}` : '';

    console.log(
      `${colors.gray}[${time}]${colors.reset} ${statusColor}${icon} ${code}${colors.reset} ${colors.bold}${method}${colors.reset} ${path} ${colors.dim}(${duration})${colors.reset}${errorSuffix}`
    );
    return;
  }

  // General messages
  let levelBadge = `${colors.cyan}[INFO]${colors.reset}`;
  if (level === 'WARN') levelBadge = `${colors.yellow}[WARN]${colors.reset}`;
  if (level === 'ERROR') levelBadge = `${colors.red}[ERROR]${colors.reset}`;
  if (level === 'DEBUG') levelBadge = `${colors.gray}[DEBUG]${colors.reset}`;

  const metaKeys = Object.keys(sanitizedMeta).filter((k) => k !== 'requestId');
  const metaStr =
    metaKeys.length > 0
      ? ` ${colors.gray}${JSON.stringify(sanitizedMeta)}${colors.reset}`
      : '';

  console.log(`${colors.gray}[${time}]${colors.reset} ${levelBadge} ${message}${metaStr}`);
}

const logger = {
  info: (message, meta = {}) => {
    if (isProduction) {
      console.log(
        JSON.stringify({
          level: 'INFO',
          timestamp: new Date().toISOString(),
          message,
          ...redactSensitiveData(meta),
        })
      );
    } else {
      printDevLog('INFO', message, meta);
    }
  },

  warn: (message, meta = {}) => {
    if (isProduction) {
      console.warn(
        JSON.stringify({
          level: 'WARN',
          timestamp: new Date().toISOString(),
          message,
          ...redactSensitiveData(meta),
        })
      );
    } else {
      printDevLog('WARN', message, meta);
    }
  },

  error: (message, meta = {}) => {
    if (isProduction) {
      console.error(
        JSON.stringify({
          level: 'ERROR',
          timestamp: new Date().toISOString(),
          message,
          ...redactSensitiveData(meta),
        })
      );
    } else {
      printDevLog('ERROR', message, meta);
      if (meta && meta.stack) {
        console.error(`${colors.red}${meta.stack}${colors.reset}`);
      }
    }
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'production') return;
    if (isProduction) {
      console.log(
        JSON.stringify({
          level: 'DEBUG',
          timestamp: new Date().toISOString(),
          message,
          ...redactSensitiveData(meta),
        })
      );
    } else {
      printDevLog('DEBUG', message, meta);
    }
  },
};

module.exports = {
  logger,
  redactSensitiveData,
};
