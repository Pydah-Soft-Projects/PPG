const express = require('express');
const refundsController = require('./refunds.controller');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');
const validate = require('../../middleware/validate');
const { requestRefundSchema } = require('./refunds.validator');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/', refundsController.listRefunds);
router.post(
  '/',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.FINANCE]),
  validate({ body: requestRefundSchema }),
  refundsController.requestRefundByAdmin
);

module.exports = router;

