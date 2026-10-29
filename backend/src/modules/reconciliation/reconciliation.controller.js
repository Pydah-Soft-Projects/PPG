const reconciliationService = require('./reconciliation.service');

class ReconciliationController {
  async getExceptions(req, res, next) {
    try {
      const data = await reconciliationService.findExceptions();
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async syncPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      const result = await reconciliationService.syncTransactionWithProvider(paymentId, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Payment synchronized with provider',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReconciliationController();

