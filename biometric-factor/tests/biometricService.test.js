const biometricService = require('../src/biometricService');
const db = require('../src/db');

describe('biometricService Unit Tests', () => {
  const userId = 'user-test-uuid-999';

  beforeEach(() => {
    db.clearInMemoryStore();
  });

  describe('generateRegisterOptions', () => {
    it('generates options and saves challenge in store', async () => {
      const options = await biometricService.generateRegisterOptions(userId, 'alice');
      expect(options).toBeDefined();
      expect(options.challenge).toBeDefined();

      const savedChallenge = await db.getChallenge(userId, 'register');
      expect(savedChallenge).toBe(options.challenge);
    });

    it('throws if userId is missing', async () => {
      await expect(biometricService.generateRegisterOptions('')).rejects.toThrow('userId is required');
    });
  });

  describe('generateLoginOptions', () => {
    it('generates login options and stores login challenge', async () => {
      const options = await biometricService.generateLoginOptions(userId);
      expect(options).toBeDefined();
      expect(options.challenge).toBeDefined();

      const savedChallenge = await db.getChallenge(userId, 'login');
      expect(savedChallenge).toBe(options.challenge);
    });

    it('includes registered credentials in allowCredentials', async () => {
      await db.saveCredential(userId, {
        id: 'cred-123',
        publicKey: Buffer.from('mock-pubkey'),
        counter: 1,
        transports: ['internal'],
      });

      const options = await biometricService.generateLoginOptions(userId);
      expect(options.allowCredentials).toHaveLength(1);
      expect(options.allowCredentials[0].id).toBeDefined();
      expect(options.allowCredentials[0].id).not.toBe('');
    });
  });

  describe('verifyLoginResponse (Fallback / 3-strikes rule)', () => {
    it('decrements attemptsRemaining and triggers fallback: "device_passcode" on 3rd failure', async () => {
      // 1st failure
      const r1 = await biometricService.verifyLoginResponse(userId, { id: 'unknown', response: {} });
      expect(r1.passed).toBe(false);
      expect(r1.attemptsRemaining).toBe(2);

      // 2nd failure
      const r2 = await biometricService.verifyLoginResponse(userId, { id: 'unknown', response: {} });
      expect(r2.passed).toBe(false);
      expect(r2.attemptsRemaining).toBe(1);

      // 3rd failure -> fallback
      const r3 = await biometricService.verifyLoginResponse(userId, { id: 'unknown', response: {} });
      expect(r3.passed).toBe(false);
      expect(r3.fallback).toBe('device_passcode');

      // Verify attempts counter was reset after fallback
      const failedCount = await db.getFailedAttempts(userId);
      expect(failedCount).toBe(0);
    });
  });
});
