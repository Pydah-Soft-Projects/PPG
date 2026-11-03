const AdminAuthService = require('../modules/admin/adminAuth.service');
const { UnauthorizedError, ForbiddenError } = require('../common/errors');

const ROLE_HIERARCHY = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT'],
  FINANCE_ADMIN: ['FINANCE_ADMIN', 'SUPPORT'],
  SUPPORT: ['SUPPORT'],
};

/**
 * Middleware factory requiring admin authentication and optional role restrictions
 * @param {string[]} allowedRoles
 */
function requireAdmin(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Admin authorization header required (Bearer token)');
      }

      const token = authHeader.split(' ')[1];
      const decoded = AdminAuthService.verifyToken(token);

      if (allowedRoles.length > 0) {
        const userPermissions = ROLE_HIERARCHY[decoded.role] || [];
        const hasAccess = allowedRoles.some((role) => userPermissions.includes(role));
        if (!hasAccess) {
          throw new ForbiddenError(`Insufficient permissions for role ${decoded.role}`);
        }
      }

      req.adminUser = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireAdmin,
  ROLE_HIERARCHY,
};

