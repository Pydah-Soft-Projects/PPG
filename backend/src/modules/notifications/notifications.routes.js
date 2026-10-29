const express = require('express');
const notificationsController = require('./notifications.controller');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);
router.use(requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]));

router.get('/', notificationsController.listNotifications);
router.post('/:id/retry', notificationsController.retryNotification);

module.exports = router;

