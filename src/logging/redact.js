const SENSITIVE_KEYS = new Set([
  'password',
  'db_password',
  'apikey',
  'api_key',
  'jira_api_token',
  'token',
  'accesstoken',
  'access_token',
  'authorization',
  'secret',
  'secret_hash',
  'api_key_hash',
  'x-signature',
  'webhooksharedsecret',
]);

const REDACTED = '[REDACTED]';

function redact(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  const result = {};
  Object.keys(value).forEach((key) => {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? REDACTED
      : redact(value[key], seen);
  });
  return result;
}

module.exports = { redact, SENSITIVE_KEYS };
