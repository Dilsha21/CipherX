const request = require('supertest');
const app = require('../src');

describe('security-admin HTTP service', () => {
  it('responds healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('security-admin');
  });

  it('validates the audit query timestamp', async () => {
    const res = await request(app).get('/internal/audit-log?since=not-a-date');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_since');
  });
});
