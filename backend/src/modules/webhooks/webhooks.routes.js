const express = require('express');
const webhooksController = require('./webhooks.controller');

const router = express.Router();

// Razorpay webhook endpoint
router.post('/razorpay/:providerConfigurationId', webhooksController.handleRazorpayWebhook);

// Cashfree webhook endpoint
router.post('/cashfree/:providerConfigurationId', webhooksController.handleCashfreeWebhook);

module.exports = router;

