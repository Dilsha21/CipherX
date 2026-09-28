const { createChallenge, getChallenge, markFactorComplete, _reset } = require('../../src/store/challengeStore');

describe('challengeStore: expiry', () => {
  beforeEach(() => _reset());

  it('returns null for a challenge past its ttlMs', async () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'], ttlMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(getChallenge(challenge.challengeId)).toBeNull();
  });

  it('still returns a challenge well within its ttlMs', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'], ttlMs: 60_000 });
    expect(getChallenge(challenge.challengeId)).not.toBeNull();
  });

  it('refuses to mark a factor complete on an expired challenge', async () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'], ttlMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(markFactorComplete(challenge.challengeId, 'biometric')).toBeNull();
  });
});
