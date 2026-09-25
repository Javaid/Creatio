const logger = require('./logger');

/**
 * Returns a child logger that stamps every entry with the given
 * correlation id (an inbound request id or a sync run id), so log lines
 * for one request/run can be traced together.
 */
function withCorrelationId(correlationId) {
  return logger.child({ correlationId });
}

module.exports = withCorrelationId;
