jest.mock('dotenv', () => ({ config: jest.fn() }));

process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '1'; // nothing listens here -> readyz fails fast (ECONNREFUSED), not a timeout
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'sa';
process.env.DB_PASSWORD = 'pw';
process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
process.env.JIRA_EMAIL = 'dev@example.com';
process.env.JIRA_API_TOKEN = 'token';
process.env.JIRA_WEBHOOK_SHARED_SECRET = 'secret';

const request = require('supertest');
const app = require('../../server');

describe('GET /healthz', () => {
  it('returns 200 ok without touching the database', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('generates and echoes a request id when none is supplied', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('echoes an inbound X-Request-Id header instead of generating a new one', async () => {
    const res = await request(app).get('/healthz').set('X-Request-Id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });
});

describe('GET /readyz', () => {
  it('returns 503 with the service marked unavailable when the database is unreachable', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable', database: 'unreachable' });
  });
});

describe('unmatched routes', () => {
  it('returns a 404 with the uniform error envelope', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
