const refundsService = require('./refunds.service');

class RefundsController {
  async requestRefundByApp(req, res, next) {
    try {
      const { paymentId } = req.params;
      const refund = await refundsService.requestRefund({
        paymentId,
        amount: req.body.amount,
        reason: req.body.reason,
        idempotencyKey: req.body.idempotencyKey,
        requestedBy: 'APPLICATION',
        actorContext: {
          actorId: req.application._id,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(201).json({
        success: true,
        message: 'Refund requested successfully',
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  }

  async requestRefundByAdmin(req, res, next) {
    try {
      const { paymentId, amount, reason, idempotencyKey } = req.body;
      const refund = await refundsService.requestRefund({
        paymentId,
        amount,
        reason,
        idempotencyKey,
        requestedBy: 'ADMIN',
        actorContext: {
          actorId: req.adminUser._id,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(201).json({
        success: true,
        message: 'Refund requested by administrator successfully',
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  }

  async listRefunds(req, res, next) {
    try {
      const { paymentId, applicationId, page, limit } = req.query;
      const result = await refundsService.listRefunds({
        paymentId,
        applicationId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      res.json({
        success: true,
        data: result.refunds,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RefundsController();

