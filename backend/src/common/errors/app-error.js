const ERROR_CODES = require('./error-codes');

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {any} [details=null]
   */
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', code = ERROR_CODES.BAD_REQUEST, details = null) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = ERROR_CODES.UNAUTHORIZED, details = null) {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message = 'Forbidden', code = ERROR_CODES.FORBIDDEN, details = null) {
    return new AppError(message, 403, code, details);
  }

  static notFound(message = 'Resource Not Found', code = ERROR_CODES.NOT_FOUND, details = null) {
    return new AppError(message, 404, code, details);
  }

  static conflict(message = 'Conflict', code = ERROR_CODES.CONFLICT, details = null) {
    return new AppError(message, 409, code, details);
  }

  static unprocessable(message = 'Unprocessable Entity', code = ERROR_CODES.UNPROCESSABLE_ENTITY, details = null) {
    return new AppError(message, 422, code, details);
  }

  static internal(message = 'Internal Server Error', code = ERROR_CODES.INTERNAL_SERVER_ERROR, details = null) {
    return new AppError(message, 500, code, details);
  }
}

module.exports = AppError;

