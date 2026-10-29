const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AdminUser = require('../database/models/admin-user.model');
const AppError = require('../common/errors/app-error');
const ERROR_CODES = require('../common/errors/error-codes');

/**
 * Admin Authentication Middleware
 * Validates JWT bearer tokens for administrative console requests.
 */
async function adminAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(
        new AppError('Admin authentication required', 401, ERROR_CODES.UNAUTHORIZED)
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, env.ADMIN_JWT_SECRET);
    } catch (err) {
      return next(
        new AppError('Invalid or expired admin session token', 401, ERROR_CODES.UNAUTHORIZED)
      );
    }

    const adminUser = await AdminUser.findById(decoded.id);
    if (!adminUser || !adminUser.isActive) {
      return next(
        new AppError('Admin user account not found or deactivated', 403, ERROR_CODES.FORBIDDEN)
      );
    }

    req.adminUser = adminUser;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control Middleware Helper
 * @param {string[]} allowedRoles
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.adminUser) {
      return next(
        new AppError('Authentication required', 401, ERROR_CODES.UNAUTHORIZED)
      );
    }

    if (!allowedRoles.includes(req.adminUser.role)) {
      return next(
        new AppError(
          `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
          403,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
}

module.exports = {
  adminAuthMiddleware,
  requireRole,
};

