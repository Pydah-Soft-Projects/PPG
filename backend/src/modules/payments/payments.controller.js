const paymentsService = require('./payments.service');

class PaymentsController {
  async createPayment(req, res, next) {
    try {
      const idempotencyKeyHeader = req.headers['x-idempotency-key'];
      const result = await paymentsService.createPayment({
        application: req.application,
        data: req.body,
        idempotencyKeyHeader,
      });

      const statusCode = result.isIdempotentReplay ? 200 : 201;

      res.status(statusCode).json({
        success: true,
        message: result.isIdempotentReplay
          ? 'Payment retrieved via idempotent replay'
          : 'Payment created successfully',
        data: {
          paymentId: result.payment._id,
          businessReference: result.payment.businessReference,
          status: result.payment.status,
          amount: result.payment.amount,
          currency: result.payment.currency,
          provider: result.payment.provider,
          providerOrderId: result.payment.providerOrderId,
          checkout: result.checkout,
          createdAt: result.payment.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentsService.verifyPayment({
        application: req.application,
        paymentId,
        verificationData: req.body,
      });

      res.json({
        success: true,
        message: 'Payment verified successfully and marked as SUCCEEDED',
        data: {
          paymentId: payment._id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          providerPaymentId: payment.providerPaymentId,
          paidAt: payment.paidAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentsService.getPaymentById({
        application: req.application,
        paymentId,
      });

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentsController();

