const { logger } = require('../common/logger/logger');

function loggingMiddleware(req, res, next) {
  // Ignore harmless dev server polling and favicon to keep terminal clean
  if (
    req.url === '/favicon.ico' ||
    req.url.startsWith('/socket.io') ||
    req.url.includes('hot-update')
  ) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    // Skip 200 OK health check polling pings from cluttering logs
    if (req.url === '/health' && res.statusCode === 200) {
      return;
    }

    const duration = Date.now() - startTime;
    logger.http({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      errorMessage: req._errorMessage || null,
    });
  });

  next();
}

module.exports = loggingMiddleware;
