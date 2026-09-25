const logger = require('../logging/logger');

/**
 * Centralized Express error handler. Emits the uniform error envelope
 * defined in docs/API-CONTRACT.md §1. Route/validator/service code should
 * throw (or next()) an Error optionally carrying `statusCode`, `code`, and
 * `details` -- anything else falls back to a generic 500.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const log = req.log || logger;

  log.error(err.message, {
    statusCode,
    code,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: {
      code,
      message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
      details: err.details || [],
    },
  });
}

module.exports = errorHandler;
