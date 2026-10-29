const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');

const requestIdMiddleware = require('./middleware/request-id');
const loggingMiddleware = require('./middleware/logging');
const rateLimiter = require('./middleware/rate-limiter');
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

// Route modules
const healthRoutes = require('./modules/health/health.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const webhooksRoutes = require('./modules/webhooks/webhooks.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const applicationsRoutes = require('./modules/applications/applications.routes');
const providerConfigurationsRoutes = require('./modules/provider-configurations/provider-configurations.routes');
const refundsRoutes = require('./modules/refunds/refunds.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const reconciliationRoutes = require('./modules/reconciliation/reconciliation.routes');
const collegesRoutes = require('./modules/colleges/colleges.routes');
const checkoutRoutes = require('./modules/checkout/checkout.routes');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,                       // Allows flexible dashboard embedding
    frameguard: false,                                  // Allows PPG drop-in SDK modal embedding in approved client apps
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows client apps to load /sdk/ppg.js
  })
);

// CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        env.DASHBOARD_ORIGIN.includes('*') ||
        env.DASHBOARD_ORIGIN.includes(origin) ||
        env.NODE_ENV === 'development'
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-App-Key',
      'X-App-Secret',
      'X-Idempotency-Key',
      'X-Razorpay-Signature',
    ],
  })
);

// Assign correlation Request ID
app.use(requestIdMiddleware);

// Request body parser with raw body buffer capture for webhook HMAC verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logging
app.use(loggingMiddleware);

// Rate limiter
app.use(rateLimiter);

// API Routes (versioned prefix /api/v1)
const apiRouter = express.Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/webhooks', webhooksRoutes);

// Admin Routes
apiRouter.use('/admin/auth', adminRoutes);
apiRouter.use('/admin/applications', applicationsRoutes);
apiRouter.use('/admin/providers', providerConfigurationsRoutes);
apiRouter.use('/admin/refunds', refundsRoutes);
apiRouter.use('/admin/notifications', notificationsRoutes);
apiRouter.use('/admin/reports', reportsRoutes);
apiRouter.use('/admin/audit-logs', auditRoutes);
apiRouter.use('/admin/reconciliation', reconciliationRoutes);
apiRouter.use('/admin/colleges', collegesRoutes);

app.use('/api/v1', apiRouter);

// Static SDK for drop-in client integrations
app.use('/sdk', express.static(path.join(__dirname, '../public/sdk')));

// Hosted Checkout Routes
app.use('/checkout', checkoutRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Pydah Payment Gateway API',
    version: '1.0.0',
    documentation: '/docs',
    health: '/api/v1/health',
  });
});

// 404 & Error Handling
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;

