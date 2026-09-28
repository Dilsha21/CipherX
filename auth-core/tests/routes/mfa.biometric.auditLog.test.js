const nock = require('nock');
const request = require('supertest');
const app = require('../../src/index');
const { biometricFactorUrl } = require('../../src/config');
const { _reset: resetUsers } = require('../../src/store/userStore');
const { _reset: resetChallenges } = require('../../src/store/challengeStore');
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

describe('POST /auth/mfa/biometric/verify audit logging', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
    resetAuditLog();
  });
  afterEach(() => nock.cleanAll());

  it('logs a success event when the biometric check passes', async () => {
    const challengeId = await registerAndLogin();
    resetAuditLog(); // drop the login event so we only assert on this step
    nock(biometricFactorUrl).post('/internal/biometric/login-verify').reply(200, { passed: true });

    await request(app).post('/auth/mfa/biometric/verify').send({ challengeId, assertionResponse: { sig: 'abc' } });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'biometric', outcome: 'success' });
  });

  it('logs a failure event when the biometric check fails', async () => {
    const challengeId = await registerAndLogin();
    resetAuditLog();
    nock(biometricFactorUrl).post('/internal/biometric/login-verify').reply(200, { passed: false });

    await request(app).post('/auth/mfa/biometric/verify').send({ challengeId, assertionResponse: { sig: 'bad' } });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'biometric', outcome: 'failure' });
  });
});
