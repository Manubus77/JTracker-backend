const express = require('express');
const config = require('./config');
const { testConnection } = require('./db');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
  });
});

app.get('/health/db', async (req, res) => {
  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: dbStatus.timestamp,
    });
  } else {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: dbStatus.error,
    });
  }
});

const start = () => {
  const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.env} mode on port ${config.port}`);
  });

  return server;
};

if (require.main === module) {
  start();
}

module.exports = {
  app,
  start,
};

