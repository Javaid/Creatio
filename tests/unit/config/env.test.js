jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('config/env', () => {
  const REQUIRED_ENV = {
    DB_HOST: 'localhost',
    DB_NAME: 'test_db',
    DB_USER: 'sa',
    DB_PASSWORD: 'pw',
    JIRA_BASE_URL: 'https://example.atlassian.net',
    JIRA_EMAIL: 'dev@example.com',
    JIRA_API_TOKEN: 'token',
    JIRA_WEBHOOK_SHARED_SECRET: 'secret',
  };

  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...REQUIRED_ENV };
    delete process.env.NODE_ENV;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads valid configuration with defaults applied', () => {
    const config = require('../../../src/config/env');
    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.isProduction).toBe(false);
    expect(config.jira.baseUrl).toBe('https://example.atlassian.net');
    expect(config.jira.projectKeys).toEqual([]);
  });

  it('parses comma-separated project keys and changelog fields, trimming whitespace', () => {
    process.env.JIRA_PROJECT_KEYS = 'PROJ1, PROJ2,PROJ3';
    process.env.CHANGELOG_TRACKED_FIELDS = 'status, assignee';
    const config = require('../../../src/config/env');
    expect(config.jira.projectKeys).toEqual(['PROJ1', 'PROJ2', 'PROJ3']);
    expect(config.changelogTrackedFields).toEqual(['status', 'assignee']);
  });

  it('throws with a descriptive error when a required variable is missing', () => {
    delete process.env.JIRA_API_TOKEN;
    expect(() => require('../../../src/config/env')).toThrow(/Invalid environment configuration/);
  });

  it('only requires JIRA_EMAIL in cloud-token auth mode', () => {
    process.env.JIRA_AUTH_MODE = 'server-pat';
    delete process.env.JIRA_EMAIL;
    expect(() => require('../../../src/config/env')).not.toThrow();
  });

  it('rejects an unknown JIRA_AUTH_MODE value', () => {
    process.env.JIRA_AUTH_MODE = 'not-a-real-mode';
    expect(() => require('../../../src/config/env')).toThrow(/Invalid environment configuration/);
  });
});
