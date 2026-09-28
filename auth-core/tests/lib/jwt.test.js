const { signSessionToken, verifySessionToken } = require('../../src/lib/jwt');

describe('jwt session tokens', () => {
  it('signs a token that verifies back to the same userId', () => {
    const { token } = signSessionToken('user-1');
    const decoded = verifySessionToken(token);
    expect(decoded.sub).toBe('user-1');
  });

  it('returns an ISO expiresAt roughly one hour out', () => {
    const { expiresAt } = signSessionToken('user-1');
    const deltaMs = new Date(expiresAt).getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(59 * 60 * 1000);
    expect(deltaMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('returns null for a garbage token', () => {
    expect(verifySessionToken('not-a-real-token')).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const jwt = require('jsonwebtoken');
    const foreignToken = jwt.sign({ sub: 'user-1' }, 'a-different-secret');
    expect(verifySessionToken(foreignToken)).toBeNull();
  });
});
