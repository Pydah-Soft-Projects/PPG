const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const AdminUser = require('./adminUser.model');
const { UnauthorizedError, ConflictError, NotFoundError } = require('../../common/errors');

class AdminAuthService {
  /**
   * Registers a new administrator (or seeds root admin)
   */
  static async registerAdmin({ email, password, name, role = 'FINANCE_ADMIN' }) {
    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ConflictError('Admin with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await AdminUser.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      isActive: true,
    });

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Logs in an admin and generates a signed JWT
   */
  static async login({ email, password }) {
    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      config.ADMIN_SESSION_SECRET,
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Verifies an admin token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.ADMIN_SESSION_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired admin token');
    }
  }
}

module.exports = AdminAuthService;

