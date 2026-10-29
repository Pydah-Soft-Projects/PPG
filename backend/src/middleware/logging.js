const { logger } = require('../common/logger/logger');

function loggingMiddleware(req, res, next) {
  // Ignore harmless dev server polling to keep terminal clean
  if (req.url.startsWith('/socket.io') || req.url.includes('hot-update')) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      errorMessage: req._errorMessage || null,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed with 5xx', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request failed with 4xx', logData);
    } else {
      logger.info('Request succeeded', logData);
    }
  });

  next();
}

module.exports = loggingMiddleware;
