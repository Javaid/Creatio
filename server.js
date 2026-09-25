const express = require('express');
const config = require('./src/config/env');
const logger = require('./src/logging/logger');
const requestContext = require('./src/middleware/requestContext');
const errorHandler = require('./src/middleware/errorHandler');
const db = require('./src/models');

const app = express();

app.use(express.json());
app.use(requestContext);

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/readyz', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    req.log.error('Readiness check failed: database unreachable', { error: err.message });
    res.status(503).json({ status: 'unavailable', database: 'unreachable' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] } });
});

app.use(errorHandler);

if (require.main === module) {
  const server = app.listen(config.port, () => {
    logger.info(`jira-creatio-sync-service listening on port ${config.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      db.sequelize
        .close()
        .catch((err) => logger.error('Error closing database pool', { error: err.message }))
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
