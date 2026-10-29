const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ADMIN_ROLE } = require('../../config/constants');
const { generateAdminUserId } = require('../../common/utils/id');

const adminUserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateAdminUserId,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ADMIN_ROLE),
      default: ADMIN_ROLE.ADMIN,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

adminUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

adminUserSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

module.exports = AdminUser;

