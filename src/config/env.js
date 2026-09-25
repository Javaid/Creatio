require('dotenv').config();
const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(1433),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_ENCRYPT: Joi.boolean().default(true),

  JIRA_AUTH_MODE: Joi.string().valid('cloud-token', 'server-pat').default('cloud-token'),
  JIRA_BASE_URL: Joi.string().uri().required(),
  JIRA_EMAIL: Joi.string().email({ tlds: false }).when('JIRA_AUTH_MODE', {
    is: 'cloud-token',
    then: Joi.required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  JIRA_API_TOKEN: Joi.string().required(),
  JIRA_PROJECT_KEYS: Joi.string().allow('').default(''),
  JIRA_WEBHOOK_SHARED_SECRET: Joi.string().required(),

  SYNC_INCREMENTAL_CRON: Joi.string().default('*/10 * * * *'),
  SYNC_FULL_CRON: Joi.string().default('0 3 * * *'),
  SYNC_ERROR_RETRY_CRON: Joi.string().default('*/5 * * * *'),

  CHANGELOG_TRACKED_FIELDS: Joi.string().default('status,assignee,priority,sprint'),
})
  .unknown(true)
  .required();

const { value: vars, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  throw new Error(
    `Invalid environment configuration: ${error.details.map((d) => d.message).join('; ')}`
  );
}

const csvToList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = {
  nodeEnv: vars.NODE_ENV,
  isProduction: vars.NODE_ENV === 'production',
  isTest: vars.NODE_ENV === 'test',
  port: vars.PORT,

  log: {
    level: vars.LOG_LEVEL,
    format: vars.LOG_FORMAT,
  },

  db: {
    host: vars.DB_HOST,
    port: vars.DB_PORT,
    name: vars.DB_NAME,
    user: vars.DB_USER,
    password: vars.DB_PASSWORD,
    encrypt: vars.DB_ENCRYPT,
  },

  jira: {
    authMode: vars.JIRA_AUTH_MODE,
    baseUrl: vars.JIRA_BASE_URL,
    email: vars.JIRA_EMAIL,
    apiToken: vars.JIRA_API_TOKEN,
    projectKeys: vars.JIRA_PROJECT_KEYS ? csvToList(vars.JIRA_PROJECT_KEYS) : [],
    webhookSharedSecret: vars.JIRA_WEBHOOK_SHARED_SECRET,
  },

  sync: {
    incrementalCron: vars.SYNC_INCREMENTAL_CRON,
    fullCron: vars.SYNC_FULL_CRON,
    errorRetryCron: vars.SYNC_ERROR_RETRY_CRON,
  },

  changelogTrackedFields: csvToList(vars.CHANGELOG_TRACKED_FIELDS),
};
