const express = require('express');
const providerConfigurationsController = require('./provider-configurations.controller');
const validate = require('../../middleware/validate');
const {
  createProviderConfigSchema,
  updateProviderConfigSchema,
  rotateProviderCredentialsSchema,
  assignApplicationsSchema,
} = require('./provider-configurations.validator');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/', providerConfigurationsController.list);
router.get('/:id', providerConfigurationsController.getById);

router.post(
  '/',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: createProviderConfigSchema }),
  providerConfigurationsController.create
);

router.patch(
  '/:id',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: updateProviderConfigSchema }),
  providerConfigurationsController.update
);

router.post(
  '/:id/rotate-credentials',
  requireRole([ADMIN_ROLE.SUPER_ADMIN]),
  validate({ body: rotateProviderCredentialsSchema }),
  providerConfigurationsController.rotateCredentials
);

router.post(
  '/:id/assign-applications',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: assignApplicationsSchema }),
  providerConfigurationsController.assignApplications
);

router.post(
  '/:id/test-connection',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  providerConfigurationsController.testConnection
);

module.exports = router;

