const AppError = require('../common/errors/app-error');
const ERROR_CODES = require('../common/errors/error-codes');
const env = require('../config/env');

const requestsMap = new Map();

/**
 * Clean up old rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestsMap.entries()) {
    if (now - record.resetTime > env.RATE_LIMIT_WINDOW_MS) {
      requestsMap.delete(key);
    }
  }
}, 60000).unref();

/**
 * Basic in-memory rate limiter middleware
 */
function rateLimiter(req, res, next) {
  const clientKey = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  let clientRecord = requestsMap.get(clientKey);

  if (!clientRecord || now > clientRecord.resetTime) {
    clientRecord = {
      count: 1,
      resetTime: now + env.RATE_LIMIT_WINDOW_MS,
    };
    requestsMap.set(clientKey, clientRecord);
  } else {
    clientRecord.count += 1;
  }

  res.setHeader('X-RateLimit-Limit', env.RATE_LIMIT_MAX);
  res.setHeader(
    'X-RateLimit-Remaining',
    Math.max(0, env.RATE_LIMIT_MAX - clientRecord.count)
  );
  res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));

  if (clientRecord.count > env.RATE_LIMIT_MAX) {
    return next(
      new AppError(
        'Too many requests, please slow down and try again later.',
        429,
        ERROR_CODES.RATE_LIMIT_EXCEEDED
      )
    );
  }

  next();
}

module.exports = rateLimiter;

