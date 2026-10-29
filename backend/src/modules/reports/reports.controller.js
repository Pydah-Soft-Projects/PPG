const reportsService = require('./reports.service');

class ReportsController {
  async getOverview(req, res, next) {
    try {
      const stats = await reportsService.getOverviewStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async listTransactions(req, res, next) {
    try {
      const {
        applicationId,
        status,
        providerConfigurationId,
        businessReference,
        collegeCode,
        courseCode,
        search,
        page,
        limit,
      } = req.query;

      const result = await reportsService.getTransactionsList({
        applicationId,
        status,
        providerConfigurationId,
        businessReference,
        collegeCode,
        courseCode,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportsController();

