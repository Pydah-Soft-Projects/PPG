const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pydah_payment_gateway',
  PROVIDER_SECRET_ENCRYPTION_KEY:
    process.env.PROVIDER_SECRET_ENCRYPTION_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  APP_CREDENTIAL_PEPPER: process.env.APP_CREDENTIAL_PEPPER || 'pydah_default_pepper_key',
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || 'pydah_admin_jwt_secret_change_in_prod',
  ADMIN_JWT_EXPIRES_IN: process.env.ADMIN_JWT_EXPIRES_IN || '7d',
  NOTIFICATION_SIGNING_SECRET:
    process.env.NOTIFICATION_SIGNING_SECRET || 'pydah_outbound_webhook_secret_key_2026',
  DASHBOARD_ORIGIN: (process.env.DASHBOARD_ORIGIN || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 120,
};

module.exports = env;

