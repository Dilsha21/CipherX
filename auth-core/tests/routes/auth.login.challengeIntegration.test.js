const request = require('supertest');
const app = require('../../src/index');
const { _reset: resetUsers } = require('../../src/store/userStore');
const { getChallenge, _reset: resetChallenges } = require('../../src/store/challengeStore');

describe('POST /auth/login challenge persistence', () => {
  beforeEach(async () => {
    resetUsers();
    resetChallenges();
    await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
  });

  it('persists the challenge returned by login so it can be looked up later', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });

    const stored = getChallenge(loginRes.body.challengeId);
    expect(stored).not.toBeNull();
    expect(stored.requiredFactors).toEqual(['biometric', 'voice_otp']);
    expect(stored.completedFactors).toEqual([]);
  });

  it('issues a different challengeId on each login attempt', async () => {
    const first = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });
    const second = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });

    expect(first.body.challengeId).not.toBe(second.body.challengeId);
  });
});
