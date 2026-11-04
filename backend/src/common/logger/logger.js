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

// Clean ANSI color codes
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

function formatCleanStack(stack) {
  if (!stack || typeof stack !== 'string') return '';
  const lines = stack.split('\n');
  const errorTitle = lines[0];

  // Filter out internal Node.js ticks and node_modules noise
  const appLines = lines.slice(1).filter((l) => {
    return !l.includes('node:internal') && !l.includes('node_modules');
  });

  const relevant = appLines.length > 0 ? appLines.slice(0, 4) : lines.slice(1, 4);
  return [errorTitle, ...relevant.map((l) => '    ' + l.trim())].join('\n');
}

function formatMetaSummary(meta = {}) {
  const sanitized = redactSensitiveData(meta);
  const ignoreKeys = ['requestId', 'stack', 'method', 'path', 'statusCode', 'durationMs', 'errorMessage'];
  const keys = Object.keys(sanitized).filter((k) => !ignoreKeys.includes(k) && sanitized[k] !== undefined && sanitized[k] !== '');

  if (keys.length === 0) return '';

  const parts = keys.map((k) => {
    const val = typeof sanitized[k] === 'object' ? JSON.stringify(sanitized[k]) : sanitized[k];
    return `${k}=${val}`;
  });

  return `${colors.gray}[${parts.join(' ')}]${colors.reset}`;
}

const isJsonFormat = process.env.LOG_FORMAT === 'json';

function printHttpLog({ method, path, statusCode = 200, durationMs = 0, errorMessage }) {
  if (isJsonFormat) {
    console.log(
      JSON.stringify({
        level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
        timestamp: new Date().toISOString(),
        type: 'HTTP',
        method,
        path,
        statusCode,
        durationMs,
        ...(errorMessage ? { error: errorMessage } : {}),
      })
    );
    return;
  }

  const time = formatConsoleTime();
  const paddedMethod = method.padEnd(6, ' ');
  const duration = `${durationMs}ms`;

  let statusColor = colors.green;
  let icon = '✔';

  if (statusCode >= 500) {
    statusColor = colors.red;
    icon = '✖';
  } else if (statusCode >= 400) {
    statusColor = colors.yellow;
    icon = '⚠';
  } else if (statusCode >= 300) {
    statusColor = colors.cyan;
    icon = '↪';
  }

  const errorSuffix = errorMessage ? ` ${colors.yellow}→ ${errorMessage}${colors.reset}` : '';

  console.log(
    `${colors.gray}[${time}]${colors.reset} ${statusColor}${icon} ${statusCode}${colors.reset} ${colors.bold}${paddedMethod}${colors.reset} ${path} ${colors.dim}(${duration})${colors.reset}${errorSuffix}`
  );
}

function printAppLog(level, message, meta = {}) {
  if (isJsonFormat) {
    const sanitizedMeta = redactSensitiveData(meta);
    console.log(
      JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        message,
        ...sanitizedMeta,
      })
    );
    return;
  }

  const time = formatConsoleTime();
  let levelBadge = `${colors.cyan}[INFO]${colors.reset}`;
  if (level === 'WARN') levelBadge = `${colors.yellow}[WARN]${colors.reset}`;
  if (level === 'ERROR') levelBadge = `${colors.red}[ERROR]${colors.reset}`;
  if (level === 'DEBUG') levelBadge = `${colors.gray}[DEBUG]${colors.reset}`;

  const metaStr = formatMetaSummary(meta);
  const spacing = metaStr ? ' ' : '';

  console.log(`${colors.gray}[${time}]${colors.reset} ${levelBadge} ${message}${spacing}${metaStr}`);

  // Print stack cleanly if error stack is present
  if (level === 'ERROR' && meta && meta.stack) {
    const cleanStack = formatCleanStack(meta.stack);
    if (cleanStack) {
      console.error(`${colors.red}${cleanStack}${colors.reset}`);
    }
  }
}

const logger = {
  http: (logData) => {
    printHttpLog(logData);
  },

  info: (message, meta = {}) => {
    printAppLog('INFO', message, meta);
  },

  warn: (message, meta = {}) => {
    printAppLog('WARN', message, meta);
  },

  error: (message, meta = {}) => {
    printAppLog('ERROR', message, meta);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'production') return;
    printAppLog('DEBUG', message, meta);
  },
};

module.exports = {
  logger,
  redactSensitiveData,
};
