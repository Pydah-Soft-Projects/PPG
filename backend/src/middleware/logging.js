const { logger } = require('../common/logger/logger');

function loggingMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with 5xx error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with 4xx warning', logData);
    } else {
      logger.info('Request handled successfully', logData);
    }
  });

  next();
}

module.exports = loggingMiddleware;

