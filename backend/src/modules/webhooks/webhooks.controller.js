const webhooksService = require('./webhooks.service');

class WebhooksController {
  async handleRazorpayWebhook(req, res, next) {
    try {
      const { providerConfigurationId } = req.params;
      const signature = req.headers['x-razorpay-signature'];

      // req.rawBody is captured by the custom body parser verify hook in app.js
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const result = await webhooksService.handleRazorpayWebhook({
        providerConfigurationId,
        rawBody,
        signature,
        payload: req.body,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WebhooksController();

