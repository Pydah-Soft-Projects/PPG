const express = require('express');
const collegesController = require('./colleges.controller');
const validate = require('../../middleware/validate');
const {
  upsertRoutingRuleSchema,
  batchUpsertRoutingRulesSchema,
  updateRoutingRuleSchema,
} = require('./colleges.validator');
const { adminAuthMiddleware, requireRole } = require('../../middleware/admin-auth');
const { ADMIN_ROLE } = require('../../config/constants');

const router = express.Router();

router.use(adminAuthMiddleware);

// Get RDS MySQL connection status
router.get('/db-status', collegesController.getDbStatus);

// List colleges from MySQL
router.get('/', collegesController.listColleges);

// List courses for a college from MySQL
router.get('/:collegeId/courses', collegesController.listCourses);

// Routing rules endpoints
router.get('/rules/all', collegesController.listRoutingRules);

router.post(
  '/rules',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: upsertRoutingRuleSchema }),
  collegesController.upsertRoutingRule
);

router.post(
  '/rules/batch',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: batchUpsertRoutingRulesSchema }),
  collegesController.batchUpsertRoutingRules
);

router.patch(
  '/rules/:id',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  validate({ body: updateRoutingRuleSchema }),
  collegesController.updateRoutingRule
);

router.delete(
  '/rules/:id',
  requireRole([ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN]),
  collegesController.deleteRoutingRule
);

module.exports = router;
