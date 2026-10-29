const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'UP',
    service: 'pydah-payment-gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

router.get('/readiness', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;

  if (isDbReady) {
    return res.json({
      status: 'READY',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'NOT_READY',
    database: 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

