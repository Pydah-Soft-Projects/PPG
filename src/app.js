const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const config = require('./config');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./common/errors');

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps or curl/server-to-server)
      if (!origin) return callback(null, true);
      const allowedOrigins = [config.DASHBOARD_ORIGIN];
      if (allowedOrigins.includes(origin) || config.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed by policy'));
    },
    credentials: true,
  })
);

// Capture raw body for webhook HMAC signature verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID tracking
app.use(requestIdMiddleware);

// Health and readiness probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pydah-payment-gateway',
    uptime: process.uptime(),
  });
});

app.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  const isReady = dbState === 1;
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    database: {
      status: dbState === 1 ? 'connected' : 'disconnected',
      readyState: dbState,
    },
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Pydah Payment Gateway API',
    version: '1.0.0',
    documentation: '/docs',
    health: '/health',
  });
});

// Placeholder for router mounts (will mount /api/v1 routes here)
const apiRouter = express.Router();
app.use('/api/v1', apiRouter);

// Export apiRouter so modules can attach their routes cleanly
app.apiRouter = apiRouter;

// Unmatched route handler (404)
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;

