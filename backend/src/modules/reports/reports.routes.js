const express = require('express');
const reportsController = require('./reports.controller');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/overview', reportsController.getOverview);
router.get(
  '/transactions',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.FINANCE, ADMIN_ROLE.VIEWER]),
  reportsController.listTransactions
);

module.exports = router;

