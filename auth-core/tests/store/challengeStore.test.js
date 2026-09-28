const { createChallenge, getChallenge, _reset } = require('../../src/store/challengeStore');

describe('challengeStore: create and get', () => {
  beforeEach(() => _reset());

  it('creates a challenge with the requested factors and no completed factors yet', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric', 'voice_otp'] });
    expect(challenge.challengeId).toBeDefined();
    expect(challenge.userId).toBe('user-1');
    expect(challenge.requiredFactors).toEqual(['biometric', 'voice_otp']);
    expect(challenge.completedFactors).toEqual([]);
  });

  it('retrieves a previously created challenge by id', () => {
    const created = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'] });
    const found = getChallenge(created.challengeId);
    expect(found).toEqual(created);
  });

  it('returns null for an unknown challengeId', () => {
    expect(getChallenge('does-not-exist')).toBeNull();
  });
});
