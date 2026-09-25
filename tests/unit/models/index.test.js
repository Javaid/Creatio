jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('models/index', () => {
  const ORIGINAL_ENV = process.env;

  beforeAll(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'test',
      DB_HOST: 'localhost',
      DB_NAME: 'test_db',
      DB_USER: 'sa',
      DB_PASSWORD: 'pw',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const EXPECTED_MODELS = [
    'JiraProject',
    'JiraIssueType',
    'JiraStatus',
    'JiraPriority',
    'JiraUser',
    'JiraSprint',
    'JiraCustomer',
    'JiraIssue',
    'JiraWorklog',
    'JiraIssueChangelog',
    'SyncCheckpoint',
    'SyncHistory',
    'SyncError',
    'ApiClient',
    'WebhookSubscription',
    'OutboundWebhookDelivery',
  ];

  it('registers every table from the database design as a model', () => {
    const db = require('../../../src/models');
    EXPECTED_MODELS.forEach((name) => {
      expect(db[name]).toBeDefined();
      expect(db[name].getTableName()).toEqual(expect.any(String));
    });
  });

  it('wires the documented associations for jira_issues', () => {
    const db = require('../../../src/models');
    expect(Object.keys(db.JiraIssue.associations)).toEqual(
      expect.arrayContaining([
        'project',
        'issueType',
        'status',
        'priority',
        'assignee',
        'reporter',
        'sprint',
        'customer',
        'parentIssue',
        'subtasks',
        'worklogs',
        'changelog',
      ])
    );
  });

  it('does not open a database connection just by loading the models', () => {
    // The connection pool object is created eagerly, but no actual
    // connection should be acquired until .authenticate()/a query is
    // called. This guards against a future regression that would make
    // model loading (e.g. at process boot) block on DB reachability.
    const db = require('../../../src/models');
    const pool = db.sequelize.connectionManager.pool;
    expect(pool._count).toBe(0);
    expect(pool._availableObjects).toHaveLength(0);
  });
});
