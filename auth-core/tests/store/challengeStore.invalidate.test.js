const { createChallenge, getChallenge, invalidateChallenge, _reset } = require('../../src/store/challengeStore');

describe('challengeStore: invalidateChallenge', () => {
  beforeEach(() => _reset());

  it('removes the challenge so it can no longer be looked up', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'] });
    invalidateChallenge(challenge.challengeId);
    expect(getChallenge(challenge.challengeId)).toBeNull();
  });

  it('returns true when a challenge was actually removed', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'] });
    expect(invalidateChallenge(challenge.challengeId)).toBe(true);
  });

  it('returns false for an already-invalidated or unknown challengeId', () => {
    expect(invalidateChallenge('does-not-exist')).toBe(false);
  });
});
