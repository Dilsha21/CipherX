const nock = require('nock');
const request = require('supertest');
const app = require('../../src/index');
const { biometricFactorUrl, voiceOtpFactorUrl } = require('../../src/config');
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

describe('MFA routes when a factor service is unreachable', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
  });
  afterEach(() => nock.cleanAll());

  it('returns 502 service_unavailable when Biometric-Factor is down', async () => {
    const challengeId = await registerAndLogin();
    nock(biometricFactorUrl).post('/internal/biometric/login-options').replyWithError('connection refused');

    const res = await request(app).post('/auth/mfa/biometric/challenge').send({ challengeId });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('service_unavailable');
  });

  it('returns 502 service_unavailable when Voice-OTP-Factor is down', async () => {
    const challengeId = await registerAndLogin();
    nock(voiceOtpFactorUrl).post('/internal/voice-otp/send').replyWithError('connection refused');

    const res = await request(app).post('/auth/mfa/voice-otp/send').send({ challengeId });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('service_unavailable');
  });
});
