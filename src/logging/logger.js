const winston = require('winston');
const config = require('../config/env');
const { redact } = require('./redact');

// Mutates the winston `info` object in place so we don't disturb the
// Symbol-keyed properties winston uses internally (e.g. Symbol.for('level')
// set by colorize) -- only redact the plain enumerable fields.
const redactFormat = winston.format((info) => {
  const redacted = redact({ ...info });
  return Object.assign(info, redacted);
});

const jsonFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const prettyFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    delete meta.service;
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${rest}`;
  })
);

const logger = winston.createLogger({
  level: config.log.level,
  format: config.log.format === 'pretty' ? prettyFormat : jsonFormat,
  defaultMeta: { service: 'jira-creatio-sync-service' },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

module.exports = logger;
