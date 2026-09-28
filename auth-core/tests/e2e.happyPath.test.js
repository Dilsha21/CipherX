const nock = require('nock');
const request = require('supertest');
const app = require('../src/index');
const { biometricFactorUrl, voiceOtpFactorUrl } = require('../src/config');
const { verifySessionToken } = require('../src/lib/jwt');
const { _reset: resetUsers } = require('../src/store/userStore');
const { _reset: resetChallenges } = require('../src/store/challengeStore');

describe('end-to-end: full three-factor login', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
  });
  afterEach(() => nock.cleanAll());

  it('walks register -> login -> biometric -> voice-otp -> finalize to a session token', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });
    const { challengeId } = loginRes.body;
    expect(loginRes.body.completedFactors).toEqual([]);

    nock(biometricFactorUrl).post('/internal/biometric/login-verify').reply(200, { passed: true });
    const bioRes = await request(app)
      .post('/auth/mfa/biometric/verify')
      .send({ challengeId, assertionResponse: { sig: 'abc' } });
    expect(bioRes.body.completedFactors).toEqual(['biometric']);

    nock(voiceOtpFactorUrl).post('/internal/voice-otp/verify').reply(200, { passed: true });
    const otpRes = await request(app)
      .post('/auth/mfa/voice-otp/verify')
      .send({ challengeId, otpId: 'otp-1', code: '123456' });
    expect(otpRes.body.completedFactors).toEqual(['biometric', 'voice_otp']);

    const finalizeRes = await request(app).post('/auth/session/finalize').send({ challengeId });
    expect(finalizeRes.status).toBe(200);
    expect(verifySessionToken(finalizeRes.body.sessionToken)).not.toBeNull();
  });
});
