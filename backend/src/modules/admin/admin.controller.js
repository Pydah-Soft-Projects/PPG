const adminService = require('./admin.service');

class AdminController {
  async register(req, res, next) {
    try {
      const user = await adminService.register(req.body, {
        actorId: req.adminUser ? req.adminUser._id : 'BOOTSTRAP',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await adminService.login(req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.json({
        success: true,
        message: 'Admin authentication successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await adminService.getMe(req.adminUser._id);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async listAdmins(req, res, next) {
    try {
      const admins = await adminService.listAdmins();
      res.json({
        success: true,
        data: admins,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();

