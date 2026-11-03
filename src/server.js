const app = require('./app');
const config = require('./config');
const logger = require('./common/logger');
const { connectDatabase, disconnectDatabase } = require('./database');

async function startServer() {
  try {
    // Attempt database connection
    try {
      await connectDatabase();
    } catch (dbErr) {
      logger.warn('Initial MongoDB connection deferred or failed. Server will start with degraded readiness.', {
        error: dbErr.message,
      });
    }

    const server = app.listen(config.PORT, () => {
      logger.info(`Pydah Payment Gateway server listening on port ${config.PORT}`, {
        env: config.NODE_ENV,
        port: config.PORT,
      });
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });

      // Force exit if not closed within 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Fatal error during server startup', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

