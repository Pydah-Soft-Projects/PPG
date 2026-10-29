const AppError = require('../common/errors/app-error');
const ERROR_CODES = require('../common/errors/error-codes');

function notFoundMiddleware(req, res, next) {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      ERROR_CODES.NOT_FOUND
    )
  );
}

module.exports = notFoundMiddleware;

