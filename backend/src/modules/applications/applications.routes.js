const express = require('express');
const applicationsController = require('./applications.controller');
const validate = require('../../middleware/validate');
const {
  createApplicationSchema,
  updateApplicationSchema,
} = require('./applications.validator');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/', applicationsController.listApplications);
router.get('/:id', applicationsController.getApplication);

router.post(
  '/',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: createApplicationSchema }),
  applicationsController.createApplication
);

router.patch(
  '/:id',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: updateApplicationSchema }),
  applicationsController.updateApplication
);

router.post(
  '/:id/rotate-credentials',
  requireRole([ADMIN_ROLE.SUPER_ADMIN]),
  applicationsController.rotateCredentials
);

module.exports = router;

