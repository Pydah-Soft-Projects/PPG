const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../common/logger');

let isConnected = false;

async function connectDatabase(uri = config.MONGODB_URI) {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    isConnected = true;
    logger.info('Connected to MongoDB database', {
      dbName: conn.connection.name,
      host: conn.connection.host,
    });
    return conn.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
}

async function disconnectDatabase() {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
  isConnected = false;
  logger.info('Disconnected from MongoDB');
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose,
};

