const express = require('express');
const checkoutController = require('./checkout.controller');

const router = express.Router();

// Hosted checkout UI page
router.get('/:paymentId', (req, res) => checkoutController.renderCheckoutPage(req, res));

// Polling endpoint to check live payment status
router.get('/:paymentId/status', (req, res) => checkoutController.getPaymentStatus(req, res));

// Verification endpoint called by the hosted checkout UI
router.post('/:paymentId/verify', (req, res) => checkoutController.verifyHostedPayment(req, res));

module.exports = router;

