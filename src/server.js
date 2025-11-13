const express = require('express');
const config = require('./config');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
  });
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

