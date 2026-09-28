const request = require('supertest');
const app = require('../../src/index');
const { _reset } = require('../../src/store/userStore');

describe('POST /auth/register', () => {
  beforeEach(() => _reset());

  it('registers a new user and returns a userId', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'correct horse battery staple', phoneNumber: '+94770000000' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
  });

  it('rejects registration with missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_fields');
  });

  it('rejects a duplicate username', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'pw1', phoneNumber: '+94770000000' });

    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'pw2', phoneNumber: '+94770000001' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('username_taken');
  });
});
