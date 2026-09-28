const request = require('supertest');
const app = require('../../src/index');
const { _reset: resetUsers } = require('../../src/store/userStore');
const { _reset: resetChallenges, markFactorComplete } = require('../../src/store/challengeStore');
const { getAuditEvents, _reset: resetAuditLog } = require('../../src/lib/auditLog');

async function registerAndLogin() {
  await request(app)
    .post('/auth/register')
    .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ username: 'alice', password: 'correct horse battery staple' });
  return loginRes.body.challengeId;
}

describe('POST /auth/session/finalize audit logging', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
    resetAuditLog();
  });

  it('logs a session failure event when factors are incomplete', async () => {
    const challengeId = await registerAndLogin();
    resetAuditLog();

    await request(app).post('/auth/session/finalize').send({ challengeId });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'session', outcome: 'failure' });
  });

  it('logs a session success event once a token is issued', async () => {
    const challengeId = await registerAndLogin();
    markFactorComplete(challengeId, 'biometric');
    markFactorComplete(challengeId, 'voice_otp');
    resetAuditLog();

    await request(app).post('/auth/session/finalize').send({ challengeId });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'session', outcome: 'success' });
  });
});
