const notificationsService = require('./notifications.service');

class NotificationsController {
  async listNotifications(req, res, next) {
    try {
      const { paymentId, applicationId, status, page, limit } = req.query;
      const result = await notificationsService.listNotifications({
        paymentId,
        applicationId,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async retryNotification(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await notificationsService.retry(id);
      res.json({
        success: true,
        message: 'Notification retry executed',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationsController();

