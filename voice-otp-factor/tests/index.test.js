const request = require('supertest');
const app = require('../src/index');

describe('voice-otp-factor', () => {
  it('responds healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('voice-otp-factor');
  });
});
