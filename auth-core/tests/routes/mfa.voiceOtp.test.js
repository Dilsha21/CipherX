const nock = require('nock');
const request = require('supertest');
const app = require('../../src/index');
const { voiceOtpFactorUrl } = require('../../src/config');
const { _reset: resetUsers } = require('../../src/store/userStore');
const { _reset: resetChallenges } = require('../../src/store/challengeStore');

async function registerAndLogin() {
  await request(app)
    .post('/auth/register')
    .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ username: 'alice', password: 'correct horse battery staple' });
  return loginRes.body.challengeId;
}

describe('POST /auth/mfa/voice-otp/*', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
  });
  afterEach(() => nock.cleanAll());

  it('proxies the send request with the registered phone number', async () => {
    const challengeId = await registerAndLogin();
    nock(voiceOtpFactorUrl)
      .post('/internal/voice-otp/send', { userId: /.+/, phoneNumber: '+94770000000' })
      .reply(200, { otpId: 'otp-1', expiresAt: '2026-01-01T00:05:00.000Z', attemptsRemaining: 3 });

    const res = await request(app).post('/auth/mfa/voice-otp/send').send({ challengeId });
    expect(res.status).toBe(200);
    expect(res.body.otpId).toBe('otp-1');
  });

  it('marks voice_otp complete on a correct code', async () => {
    const challengeId = await registerAndLogin();
    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: true });

    const res = await request(app)
      .post('/auth/mfa/voice-otp/verify')
      .send({ challengeId, otpId: 'otp-1', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ factor: 'voice_otp', passed: true, completedFactors: ['voice_otp'] });
  });

  it('returns attemptsRemaining on an incorrect code without failing the request', async () => {
    const challengeId = await registerAndLogin();
    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: false, attemptsRemaining: 2 });

    const res = await request(app)
      .post('/auth/mfa/voice-otp/verify')
      .send({ challengeId, otpId: 'otp-1', code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ factor: 'voice_otp', passed: false, attemptsRemaining: 2 });
  });

  it('accumulates completedFactors when biometric already passed', async () => {
    const challengeId = await registerAndLogin();
    const { markFactorComplete } = require('../../src/store/challengeStore');
    markFactorComplete(challengeId, 'biometric');

    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: true });

    const res = await request(app)
      .post('/auth/mfa/voice-otp/verify')
      .send({ challengeId, otpId: 'otp-1', code: '123456' });

    expect(res.body.completedFactors).toEqual(['biometric', 'voice_otp']);
  });
});
