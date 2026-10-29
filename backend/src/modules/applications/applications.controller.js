const applicationsService = require('./applications.service');

class ApplicationsController {
  async createApplication(req, res, next) {
    try {
      const result = await applicationsService.createApplication(req.body, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({
        success: true,
        message: 'Application registered successfully. Securely record the secret now; it will not be shown again.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listApplications(req, res, next) {
    try {
      const apps = await applicationsService.listApplications();
      res.json({
        success: true,
        data: apps,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApplication(req, res, next) {
    try {
      const { id } = req.params;
      const data = await applicationsService.getApplicationById(id);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateApplication(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await applicationsService.updateApplication(id, req.body, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({
        success: true,
        message: 'Application updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async rotateCredentials(req, res, next) {
    try {
      const { id } = req.params;
      const credentials = await applicationsService.rotateCredentials(id, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({
        success: true,
        message: 'Application credentials rotated successfully. Store the secret now; it cannot be recovered.',
        data: credentials,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApplicationsController();

