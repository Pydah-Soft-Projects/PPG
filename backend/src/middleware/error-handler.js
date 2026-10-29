const { logger } = require('../common/logger/logger');
const AppError = require('../common/errors/app-error');
const ERROR_CODES = require('../common/errors/error-codes');
const env = require('../config/env');

function errorHandlerMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An unexpected internal error occurred';
  let details = err.details || null;

  // Handle express JSON body parser syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = 'Malformed JSON in request payload';
  }

  // Handle Mongoose CastError
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = `Invalid format for resource identifier '${err.path}'`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = 'Database validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = ERROR_CODES.CONFLICT;
    message = 'Duplicate key collision on a unique field';
    details = err.keyValue;
  }

  // Attach formatted error message to req for clean one-line logging
  req._errorMessage = message;

  // If 500 internal server error, log full stack trace for debugging
  if (statusCode >= 500) {
    logger.error(`Internal server error: ${message}`, {
      requestId: req.id,
      path: req.originalUrl,
      stack: err.stack,
    });
  }

  const responsePayload = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
      requestId: req.id,
      ...(env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(responsePayload);
}

module.exports = errorHandlerMiddleware;
