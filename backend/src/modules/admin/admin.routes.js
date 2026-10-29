const express = require('express');
const adminController = require('./admin.controller');
const validate = require('../../middleware/validate');
const { loginSchema, registerSchema } = require('./admin.validator');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

// Public auth endpoints
router.post('/login', validate({ body: loginSchema }), adminController.login);
router.post('/register', validate({ body: registerSchema }), adminController.register);

// Protected admin endpoints
router.get('/me', adminAuthMiddleware, adminController.getMe);
router.get(
  '/users',
  adminAuthMiddleware,
  requireRole([ADMIN_ROLE.SUPER_ADMIN]),
  adminController.listAdmins
);

module.exports = router;

