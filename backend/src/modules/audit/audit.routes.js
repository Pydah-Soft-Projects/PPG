const express = require('express');
const auditController = require('./audit.controller');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);
router.use(requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.FINANCE]));

router.get('/', auditController.listLogs);

module.exports = router;

