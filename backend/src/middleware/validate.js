const AppError = require('../common/errors/app-error');
const ERROR_CODES = require('../common/errors/error-codes');

/**
 * Higher-order middleware to validate incoming request data using Zod
 * @param {Object} schemas
 * @param {import('zod').ZodSchema} [schemas.body]
 * @param {import('zod').ZodSchema} [schemas.query]
 * @param {import('zod').ZodSchema} [schemas.params]
 */
function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.body && req.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query && req.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params && req.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error.errors && Array.isArray(error.errors)) {
        const formatted = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return next(
          new AppError(
            `Validation error: ${formatted.map((f) => f.message).join(', ')}`,
            400,
            ERROR_CODES.BAD_REQUEST,
            formatted
          )
        );
      }
      return next(error);
    }
  };
}

module.exports = validate;

