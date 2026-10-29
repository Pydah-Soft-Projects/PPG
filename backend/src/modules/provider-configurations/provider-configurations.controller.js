const providerConfigurationsService = require('./provider-configurations.service');

class ProviderConfigurationsController {
  async create(req, res, next) {
    try {
      const config = await providerConfigurationsService.createConfiguration(req.body, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({
        success: true,
        message: 'Provider configuration saved successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { environment, provider } = req.query;
      const configs = await providerConfigurationsService.listConfigurations({
        environment,
        provider,
      });
      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const config = await providerConfigurationsService.getConfigurationById(id);
      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await providerConfigurationsService.updateConfiguration(id, req.body, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({
        success: true,
        message: 'Provider configuration updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async rotateCredentials(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await providerConfigurationsService.rotateCredentials(id, req.body, {
        actorId: req.adminUser._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({
        success: true,
        message: 'Credentials rotated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignApplications(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await providerConfigurationsService.assignApplications(
        id,
        req.body.allowedApplicationIds,
        {
          actorId: req.adminUser._id,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
      res.json({
        success: true,
        message: 'Applications assigned successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async testConnection(req, res, next) {
    try {
      const { id } = req.params;
      const result = await providerConfigurationsService.testConnection(id);
      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProviderConfigurationsController();

