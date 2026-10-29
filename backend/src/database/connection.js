const mongoose = require('mongoose');
const env = require('../config/env');
const { logger } = require('../common/logger/logger');

let isConnected = false;

async function connectDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true, // Build indexes automatically in development
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info('Connected to MongoDB database successfully', {
      uri: env.MONGODB_URI.replace(/:\/\/.*@/, '://<credentials>@'),
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
}

async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connection closed');
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};

