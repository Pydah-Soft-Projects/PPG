const { z } = require('zod');
const { ADMIN_ROLE } = require('../../config/constants');

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(ADMIN_ROLE).optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
};

