const crypto = require('crypto');
const withCorrelationId = require('../logging/withCorrelationId');

/**
 * Assigns a request id (or reuses an inbound X-Request-Id), echoes it back
 * on the response, and attaches a correlation-scoped child logger as
 * req.log so every log line for this request can be traced together.
 */
function requestContext(req, res, next) {
  const requestId = req.get('X-Request-Id') || crypto.randomUUID();
  req.id = requestId;
  req.log = withCorrelationId(requestId);
  res.set('X-Request-Id', requestId);
  next();
}

module.exports = requestContext;
