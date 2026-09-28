const request = require('supertest');
const app = require('../../src/index');
const { _reset } = require('../../src/store/userStore');

describe('POST /auth/register and /auth/login field normalization', () => {
  beforeEach(() => _reset());

  it('rejects registration with a whitespace-only username', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: '   ', password: 'pw', phoneNumber: '+94770000000' });
    expect(res.status).toBe(400);
  });

  it('registers with a padded username and finds it on login after trimming', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: '  alice  ', password: 'pw', phoneNumber: '+94770000000' });

    const res = await request(app).post('/auth/login').send({ username: 'alice', password: 'pw' });
    expect(res.status).toBe(200);
  });
});
