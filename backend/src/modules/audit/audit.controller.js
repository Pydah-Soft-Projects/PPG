const auditService = require('./audit.service');

class AuditController {
  async listLogs(req, res, next) {
    try {
      const { action, actorId, targetId, limit, page } = req.query;
      const result = await auditService.listLogs({
        action,
        actorId,
        targetId,
        limit: limit ? parseInt(limit, 10) : 50,
        page: page ? parseInt(page, 10) : 1,
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditController();

