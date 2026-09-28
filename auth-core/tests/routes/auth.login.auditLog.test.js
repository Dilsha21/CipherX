const request = require('supertest');
const app = require('../../src/index');
const { _reset: resetUsers } = require('../../src/store/userStore');
const { getAuditEvents, _reset: resetAuditLog } = require('../../src/lib/auditLog');

describe('POST /auth/login audit logging', () => {
  beforeEach(async () => {
    resetUsers();
    resetAuditLog();
    await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
  });

  it('logs a success event for a correct login', async () => {
    await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'password', outcome: 'success' });
    expect(events[0].userId).toBeDefined();
  });

  it('logs a failure event for a wrong password, with a null userId not omitted for an unknown user', async () => {
    await request(app).post('/auth/login').send({ username: 'nobody', password: 'whatever' });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'password', outcome: 'failure', userId: null });
  });

  it('logs a failure event with the real userId for a known user with a wrong password', async () => {
    await request(app).post('/auth/login').send({ username: 'alice', password: 'wrong password' });

    const [event] = getAuditEvents();
    expect(event.outcome).toBe('failure');
    expect(event.userId).not.toBeNull();
  });

  it('does not log an event for a request rejected by validation before reaching the store', async () => {
    await request(app).post('/auth/login').send({ username: 'alice' });
    expect(getAuditEvents()).toHaveLength(0);
  });
});
