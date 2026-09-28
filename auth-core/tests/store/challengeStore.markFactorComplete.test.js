const { createChallenge, markFactorComplete, _reset } = require('../../src/store/challengeStore');

describe('challengeStore: markFactorComplete', () => {
  beforeEach(() => _reset());

  it('adds a factor to completedFactors', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric', 'voice_otp'] });
    const updated = markFactorComplete(challenge.challengeId, 'biometric');
    expect(updated.completedFactors).toEqual(['biometric']);
  });

  it('is idempotent when the same factor is marked twice', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric'] });
    markFactorComplete(challenge.challengeId, 'biometric');
    const updated = markFactorComplete(challenge.challengeId, 'biometric');
    expect(updated.completedFactors).toEqual(['biometric']);
  });

  it('accumulates multiple distinct factors', () => {
    const challenge = createChallenge({ userId: 'user-1', requiredFactors: ['biometric', 'voice_otp'] });
    markFactorComplete(challenge.challengeId, 'biometric');
    const updated = markFactorComplete(challenge.challengeId, 'voice_otp');
    expect(updated.completedFactors).toEqual(['biometric', 'voice_otp']);
  });

  it('returns null for an unknown challengeId', () => {
    expect(markFactorComplete('does-not-exist', 'biometric')).toBeNull();
  });
});
