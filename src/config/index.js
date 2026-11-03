const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/pydah_payment_gateway'),
  PROVIDER_SECRET_ENCRYPTION_KEY: z.string().min(64, 'Must be 64 hex characters (32 bytes)').default(
    // Deterministic safe key for tests/dev default if omitted
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  ),
  APP_CREDENTIAL_PEPPER: z.string().min(16).default('default_pepper_for_local_development_testing_only'),
  ADMIN_SESSION_SECRET: z.string().min(16).default('default_admin_session_secret_for_local_testing_only'),
  DASHBOARD_ORIGIN: z.string().default('http://localhost:3000'),
  NOTIFICATION_TIMEOUT_MS: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment variables. Check .env configuration.');
}

module.exports = parsed.data;

