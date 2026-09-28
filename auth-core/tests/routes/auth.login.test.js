const request = require('supertest');
const app = require('../../src/index');
const { _reset } = require('../../src/store/userStore');

describe('POST /auth/login', () => {
  beforeEach(async () => {
    _reset();
    await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });
  });

  it('accepts a correct username/password and returns a challenge', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'correct horse battery staple' });

    expect(res.status).toBe(200);
    expect(res.body.challengeId).toBeDefined();
    expect(res.body.requiredFactors).toEqual(['biometric', 'voice_otp']);
    expect(res.body.completedFactors).toEqual([]);
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'wrong password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('rejects an unknown username', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'nobody', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('rejects a missing password field', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_fields');
  });
});
