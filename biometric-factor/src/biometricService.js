const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const db = require('./db');
const { logAuditEvent } = require('./securityStub');

const RP_NAME = process.env.RP_NAME || 'CipherX MFA';
const RP_ID = process.env.RP_ID || 'localhost';
const EXPECTED_ORIGIN = process.env.EXPECTED_ORIGIN || 'http://localhost:5173';

const biometricService = {
  /**
   * Generate WebAuthn registration options for a given userId.
   */
  async generateRegisterOptions(userId, userName = userId) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const userCredentials = await db.getCredentialsByUserId(userId);
    const excludeCredentials = userCredentials.map((cred) => ({
      id: cred.id,
      transports: cred.transports,
    }));

    // Convert string userId to Uint8Array for SimpleWebAuthn
    const userIDUint8 = Uint8Array.from(Buffer.from(userId));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userIDUint8,
      userName: userName || userId,
      userDisplayName: userName || userId,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Save the challenge in the database / in-memory store
    await db.saveChallenge(userId, options.challenge, 'register');

    return options;
  },

  /**
   * Verify WebAuthn registration attestation response sent by browser.
   */
  async verifyRegisterResponse(userId, attestationResponse) {
    if (!userId || !attestationResponse) {
      throw new Error('userId and attestationResponse are required');
    }

    const expectedChallenge = await db.getChallenge(userId, 'register');
    if (!expectedChallenge) {
      throw new Error('No pending registration challenge found or challenge expired');
    }

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge,
      expectedOrigin: [EXPECTED_ORIGIN, 'http://localhost:5173', 'http://localhost:4000'],
      expectedRPID: RP_ID,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;
      // Store public key and credential metadata (NEVER raw biometric data)
      await db.saveCredential(userId, {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports || attestationResponse.response?.transports || [],
      });

      // Clear challenge
      await db.deleteChallenge(userId, 'register');

      logAuditEvent({ userId, factor: 'biometric', outcome: 'registration_success' });

      return { registered: true };
    } else {
      logAuditEvent({ userId, factor: 'biometric', outcome: 'registration_failure' });
      throw new Error('Registration attestation verification failed');
    }
  },

  /**
   * Generate WebAuthn authentication (login) options for a given userId.
   */
  async generateLoginOptions(userId) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const userCredentials = await db.getCredentialsByUserId(userId);

    const allowCredentials = userCredentials.map((cred) => ({
      id: typeof cred.id === 'string' ? Uint8Array.from(Buffer.from(cred.id)) : cred.id,
      transports: cred.transports,
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Save the login challenge
    await db.saveChallenge(userId, options.challenge, 'login');

    return options;
  },

  /**
   * Verify WebAuthn login assertion response sent by browser.
   * Implements 3-strikes fallback rule (FR5 / Doc2 Section 5).
   */
  async verifyLoginResponse(userId, assertionResponse) {
    if (!userId || !assertionResponse) {
      throw new Error('userId and assertionResponse are required');
    }

    const expectedChallenge = await db.getChallenge(userId, 'login');
    if (!expectedChallenge) {
      return this._handleFailedAttempt(userId, 'No pending authentication challenge found');
    }

    const credential = await db.getCredentialById(assertionResponse.id);
    if (!credential) {
      return this._handleFailedAttempt(userId, 'Credential not registered for this user');
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge,
        expectedOrigin: [EXPECTED_ORIGIN, 'http://localhost:5173', 'http://localhost:4000'],
        expectedRPID: RP_ID,
        authenticator: {
          credentialPublicKey: credential.publicKey,
          credentialID: credential.id,
          counter: credential.counter,
        },
      });

      const { verified, authenticationInfo } = verification;

      if (verified && authenticationInfo) {
        // Update counter
        await db.updateCredentialCounter(credential.id, authenticationInfo.newCounter);
        // Clear challenge & reset failed attempts
        await db.deleteChallenge(userId, 'login');
        await db.resetFailedAttempts(userId);

        logAuditEvent({ userId, factor: 'biometric', outcome: 'success' });

        return { passed: true };
      } else {
        return await this._handleFailedAttempt(userId, 'Assertion verification failed');
      }
    } catch (err) {
      return await this._handleFailedAttempt(userId, err.message);
    }
  },

  /**
   * Internal helper to process failed verification attempt and enforce 3-strikes rule.
   */
  async _handleFailedAttempt(userId, reason) {
    logAuditEvent({ userId, factor: 'biometric', outcome: 'failure', details: { reason } });

    const failedAttempts = await db.incrementFailedAttempts(userId);

    // If reached 3 failed attempts, trigger device_passcode fallback and reset counter so it stops counting against the account
    if (failedAttempts >= 3) {
      await db.resetFailedAttempts(userId);
      await db.deleteChallenge(userId, 'login');
      return {
        passed: false,
        fallback: 'device_passcode',
      };
    }

    return {
      passed: false,
      attemptsRemaining: 3 - failedAttempts,
    };
  },
};

module.exports = biometricService;
