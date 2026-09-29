const express = require('express');
const request = require('supertest');
const { createSecurityModule } = require('../src');
const securityAdmin = require('../src');

describe('rateLimiter middleware', () => {
  it('supports the original contract without an explicit store', async () => {
    const testApp = express();
    testApp.use(securityAdmin.rateLimiter({ windowMs: 1000, max: 1, keyGenerator: () => 'contract-test' }));
    testApp.get('/', (_req, res) => res.json({ ok: true }));
    expect((await request(testApp).get('/')).status).toBe(200);
    expect((await request(testApp).get('/')).status).toBe(429);
  });

  it('returns accessible 429 details and retry headers', async () => {
    let now = 1000;
    const module = createSecurityModule({ clock: () => now });
    const testApp = express();
    testApp.use(module.rateLimiter({ windowMs: 1000, max: 1, keyGenerator: () => 'acct-1' }));
    testApp.get('/', (_req, res) => res.json({ ok: true }));

    expect((await request(testApp).get('/')).status).toBe(200);
    const denied = await request(testApp).get('/');
    expect(denied.status).toBe(429);
    expect(denied.body).toMatchObject({ error: 'rate_limited', retryAfter: 1 });
    expect(denied.headers['retry-after']).toBe('1');
    now += 1000;
    expect((await request(testApp).get('/')).status).toBe(200);
  });
});
