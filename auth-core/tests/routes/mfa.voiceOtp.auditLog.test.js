const nock = require('nock');
const request = require('supertest');
const app = require('../../src/index');
const { voiceOtpFactorUrl } = require('../../src/config');
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

describe('POST /auth/mfa/voice-otp/verify audit logging', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
    resetAuditLog();
  });
  afterEach(() => nock.cleanAll());

  it('logs a success event on a correct code', async () => {
    const challengeId = await registerAndLogin();
    resetAuditLog();
    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: true });

    await request(app).post('/auth/mfa/voice-otp/verify').send({ challengeId, otpId: 'otp-1', code: '123456' });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'voice_otp', outcome: 'success' });
  });

  it('logs a failure event on an incorrect code', async () => {
    const challengeId = await registerAndLogin();
    resetAuditLog();
    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: false, attemptsRemaining: 2 });

    await request(app).post('/auth/mfa/voice-otp/verify').send({ challengeId, otpId: 'otp-1', code: '000000' });

    const events = getAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ factor: 'voice_otp', outcome: 'failure' });
  });
});
