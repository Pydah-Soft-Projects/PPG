const express = require('express');
const reconciliationController = require('./reconciliation.controller');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);
router.use(requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.FINANCE]));

router.get('/exceptions', reconciliationController.getExceptions);
router.post('/sync/:paymentId', reconciliationController.syncPayment);

module.exports = router;

