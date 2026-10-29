const express = require('express');
const paymentsController = require('./payments.controller');
const refundsController = require('../refunds/refunds.controller');
const appAuthMiddleware = require('../../middleware/app-auth');
const validate = require('../../middleware/validate');
const { createPaymentSchema, verifyPaymentSchema } = require('./payments.validator');
const { requestRefundSchema } = require('../refunds/refunds.validator');

const router = express.Router();

// All payment routes are authenticated via application S2S credentials
router.use(appAuthMiddleware);

router.post('/', validate({ body: createPaymentSchema }), paymentsController.createPayment);
router.get('/:paymentId', paymentsController.getPayment);
router.post(
  '/:paymentId/verify',
  validate({ body: verifyPaymentSchema }),
  paymentsController.verifyPayment
);
router.post(
  '/:paymentId/refund',
  validate({ body: requestRefundSchema }),
  refundsController.requestRefundByApp
);

module.exports = router;

