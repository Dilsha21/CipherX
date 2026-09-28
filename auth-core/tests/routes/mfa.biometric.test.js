const nock = require('nock');
const request = require('supertest');
const app = require('../../src/index');
const { biometricFactorUrl } = require('../../src/config');
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

describe('POST /auth/mfa/biometric/*', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
  });
  afterEach(() => nock.cleanAll());

  it('proxies the challenge request to Biometric-Factor', async () => {
    const challengeId = await registerAndLogin();
    nock(biometricFactorUrl)
      .post('/internal/biometric/login-options')
      .reply(200, { challenge: 'base64-challenge' });

    const res = await request(app).post('/auth/mfa/biometric/challenge').send({ challengeId });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ challenge: 'base64-challenge' });
  });

  it('rejects a biometric challenge request for an invalid challengeId', async () => {
    const res = await request(app).post('/auth/mfa/biometric/challenge').send({ challengeId: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_challenge');
  });

  it('marks biometric complete and returns completedFactors on a successful verify', async () => {
    const challengeId = await registerAndLogin();
    nock(biometricFactorUrl).post('/internal/biometric/login-verify').reply(200, { passed: true });

    const res = await request(app)
      .post('/auth/mfa/biometric/verify')
      .send({ challengeId, assertionResponse: { sig: 'abc' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ factor: 'biometric', passed: true, completedFactors: ['biometric'] });
  });

  it('returns 401 factor_failed when Biometric-Factor reports passed:false', async () => {
    const challengeId = await registerAndLogin();
    nock(biometricFactorUrl).post('/internal/biometric/login-verify').reply(200, { passed: false });

    const res = await request(app)
      .post('/auth/mfa/biometric/verify')
      .send({ challengeId, assertionResponse: { sig: 'bad' } });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('factor_failed');
  });
});
