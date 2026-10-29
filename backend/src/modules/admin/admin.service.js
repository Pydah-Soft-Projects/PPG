const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../../database/models/admin-user.model');
const { ADMIN_ROLE, AUDIT_ACTION } = require('../../config/constants');
const env = require('../../config/env');
const AppError = require('../../common/errors/app-error');
const ERROR_CODES = require('../../common/errors/error-codes');
const auditService = require('../audit/audit.service');

class AdminService {
  async register({ username, email, password, role }, actorContext = {}) {
    const existing = await AdminUser.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });

    if (existing) {
      throw AppError.conflict('An admin account with this username or email already exists');
    }

    const totalAdmins = await AdminUser.countDocuments();
    // Bootstrap: if this is the first admin user, grant SUPER_ADMIN
    const assignedRole = totalAdmins === 0 ? ADMIN_ROLE.SUPER_ADMIN : (role || ADMIN_ROLE.ADMIN);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await AdminUser.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      role: assignedRole,
      isActive: true,
    });

    await auditService.log({
      action: AUDIT_ACTION.ADMIN_REGISTER,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || newUser._id,
      targetType: 'ADMIN_USER',
      targetId: newUser._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: { username: newUser.username, role: newUser.role },
    });

    return newUser.toSafeObject();
  }

  async login({ username, password }, clientContext = {}) {
    const user = await AdminUser.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
    });

    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid username or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid username or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      env.ADMIN_JWT_SECRET,
      { expiresIn: env.ADMIN_JWT_EXPIRES_IN }
    );

    await auditService.log({
      action: AUDIT_ACTION.ADMIN_LOGIN,
      actorType: 'ADMIN',
      actorId: user._id,
      targetType: 'ADMIN_USER',
      targetId: user._id,
      ipAddress: clientContext.ip,
      userAgent: clientContext.userAgent,
    });

    return {
      token,
      user: user.toSafeObject(),
    };
  }

  async getMe(userId) {
    const user = await AdminUser.findById(userId);
    if (!user) {
      throw AppError.notFound('Admin user not found');
    }
    return user.toSafeObject();
  }

  async listAdmins() {
    const users = await AdminUser.find().sort({ createdAt: -1 });
    return users.map((u) => u.toSafeObject());
  }
}

module.exports = new AdminService();

