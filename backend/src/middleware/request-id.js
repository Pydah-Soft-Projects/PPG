const crypto = require('crypto');

/**
 * Middleware that assigns a unique request ID to incoming requests
 * and sets the X-Request-ID response header.
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : `req_${crypto.randomBytes(8).toString('hex')}`;

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

module.exports = requestIdMiddleware;

