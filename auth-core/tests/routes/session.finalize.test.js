const request = require('supertest');
const app = require('../../src/index');
const { verifySessionToken } = require('../../src/lib/jwt');
const { _reset: resetUsers } = require('../../src/store/userStore');
const { _reset: resetChallenges, markFactorComplete } = require('../../src/store/challengeStore');

async function registerAndLogin() {
  await request(app)
    .post('/auth/register')
    .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ username: 'alice', password: 'correct horse battery staple' });
  return loginRes.body.challengeId;
}

describe('POST /auth/session/finalize', () => {
  beforeEach(() => {
    resetUsers();
    resetChallenges();
  });

  it('rejects finalize with an invalid challengeId', async () => {
    const res = await request(app).post('/auth/session/finalize').send({ challengeId: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_challenge');
  });

  it('returns 409 factors_incomplete with the list of missing factors when none have passed', async () => {
    const challengeId = await registerAndLogin();
    const res = await request(app).post('/auth/session/finalize').send({ challengeId });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('factors_incomplete');
    expect(res.body.missing).toEqual(['biometric', 'voice_otp']);
    expect(typeof res.body.message).toBe('string');
  });

  it('returns 409 factors_incomplete listing only the factor still missing', async () => {
    const challengeId = await registerAndLogin();
    markFactorComplete(challengeId, 'biometric');

    const res = await request(app).post('/auth/session/finalize').send({ challengeId });
    expect(res.status).toBe(409);
    expect(res.body.missing).toEqual(['voice_otp']);
  });

  it('issues a valid session token once all required factors have passed', async () => {
    const challengeId = await registerAndLogin();
    markFactorComplete(challengeId, 'biometric');
    markFactorComplete(challengeId, 'voice_otp');

    const res = await request(app).post('/auth/session/finalize').send({ challengeId });

    expect(res.status).toBe(200);
    expect(res.body.sessionToken).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();

    const decoded = verifySessionToken(res.body.sessionToken);
    expect(decoded).not.toBeNull();
  });

  it('rejects a second finalize call with the same challengeId (no replay)', async () => {
    const challengeId = await registerAndLogin();
    markFactorComplete(challengeId, 'biometric');
    markFactorComplete(challengeId, 'voice_otp');

    const first = await request(app).post('/auth/session/finalize').send({ challengeId });
    expect(first.status).toBe(200);

    const second = await request(app).post('/auth/session/finalize').send({ challengeId });
    expect(second.status).toBe(400);
    expect(second.body.error).toBe('invalid_challenge');
  });
});
