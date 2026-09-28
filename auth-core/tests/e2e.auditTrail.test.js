const nock = require('nock');
const request = require('supertest');
const app = require('../src/index');
const { biometricFactorUrl, voiceOtpFactorUrl } = require('../src/config');
const { _reset: resetUsers } = require('../src/store/userStore');
const { _reset: resetChallenges } = require('../src/store/challengeStore');
const { getAuditEvents, _reset: resetAuditLog } = require('../src/lib/auditLog');

describe('end-to-end: audit trail for a full three-factor login', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
    resetAuditLog();
  });
  afterEach(() => nock.cleanAll());

  it('records one success event per step, in order, all for the same userId', async () => {
    const registerRes = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
    const { userId } = registerRes.body;

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });
    const { challengeId } = loginRes.body;

    nock(biometricFactorUrl).post('/internal/biometric/login-verify').reply(200, { passed: true });
    await request(app)
      .post('/auth/mfa/biometric/verify')
      .send({ challengeId, assertionResponse: { sig: 'abc' } });

    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: true });
    await request(app)
      .post('/auth/mfa/voice-otp/verify')
      .send({ challengeId, otpId: 'otp-1', code: '123456' });

    await request(app).post('/auth/session/finalize').send({ challengeId });

    const events = getAuditEvents();
    expect(events.map((e) => e.factor)).toEqual(['password', 'biometric', 'voice_otp', 'session']);
    expect(events.every((e) => e.outcome === 'success')).toBe(true);
    expect(events.every((e) => e.userId === userId)).toBe(true);
    expect(events.every((e) => typeof e.timestamp === 'string')).toBe(true);
  });
});
