const express = require('express');
const request = require('supertest');
const { requireChallenge } = require('../../src/lib/challengeLookup');
const { createChallenge, _reset } = require('../../src/store/challengeStore');

function buildTestApp() {
  const app = express();
  app.get('/probe/:challengeId', (req, res) => {
    const challenge = requireChallenge(req, res, req.params.challengeId);
    if (!challenge) return;
    res.json({ found: true, userId: challenge.userId });
  });
  return app;
}

describe('requireChallenge', () => {
  beforeEach(() => _reset());

  it('returns the challenge and lets the handler continue when valid', async () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'] });
    const res = await request(buildTestApp()).get(`/probe/${challenge.challengeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ found: true, userId: 'user-1' });
  });

  it('responds with invalid_challenge and stops the handler when missing', async () => {
    const res = await request(buildTestApp()).get('/probe/does-not-exist');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_challenge');
  });
});
