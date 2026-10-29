const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const { logger } = require('./common/logger/logger');

let server;

async function bootstrap() {
  try {
    // 1. Establish Database Connection
    await connectDatabase();

    // 2. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(`Pydah Payment Gateway server listening on port ${env.PORT}`, {
        port: env.PORT,
        environment: env.NODE_ENV,
      });
    });

    // 3. Graceful Shutdown Handlers
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          await disconnectDatabase();
          process.exit(0);
        });
      } else {
        await disconnectDatabase();
        process.exit(0);
      }

      // Force terminate if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Graceful shutdown timed out. Terminating process forcibly.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : null,
      });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to bootstrap server', { error: error.message });
    process.exit(1);
  }
}

bootstrap();

