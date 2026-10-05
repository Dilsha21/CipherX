const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');
const biometricService = require('../src/biometricService');

describe('Biometric Factor API Endpoints', () => {
  const testUserId = 'user-12345';

  beforeEach(() => {
    db.clearInMemoryStore();
  });

  describe('GET /health', () => {
    it('responds healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('biometric-factor');
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /internal/biometric/register-options', () => {
    it('returns WebAuthn PublicKeyCredentialCreationOptions for valid userId', async () => {
      const res = await request(app)
        .post('/internal/biometric/register-options')
        .send({ userId: testUserId, userName: 'testuser' });

      expect(res.status).toBe(200);
      expect(res.body.challenge).toBeDefined();
      expect(res.body.rp.name).toBe('CipherX MFA');
      expect(res.body.user.id).toBeDefined();
    });

    it('returns 400 when userId is missing', async () => {
      const res = await request(app)
        .post('/internal/biometric/register-options')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_user_id');
    });
  });

  describe('POST /internal/biometric/register-verify', () => {
    it('returns 400 when parameters are missing', async () => {
      const res = await request(app)
        .post('/internal/biometric/register-verify')
        .send({ userId: testUserId });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_parameters');
    });

    it('returns 400 if no challenge exists for user', async () => {
      const res = await request(app)
        .post('/internal/biometric/register-verify')
        .send({
          userId: testUserId,
          attestationResponse: { id: 'dummy-id', response: {} },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('attestation_verification_failed');
    });
  });

  describe('POST /internal/biometric/login-options', () => {
    it('returns WebAuthn PublicKeyCredentialRequestOptions for valid userId', async () => {
      const res = await request(app)
        .post('/internal/biometric/login-options')
        .send({ userId: testUserId });

      expect(res.status).toBe(200);
      expect(res.body.challenge).toBeDefined();
      expect(res.body.allowCredentials).toEqual([]);
    });

    it('returns 400 when userId is missing', async () => {
      const res = await request(app)
        .post('/internal/biometric/login-options')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_user_id');
    });
  });

  describe('POST /internal/biometric/login-verify', () => {
    it('returns 400 when parameters are missing', async () => {
      const res = await request(app)
        .post('/internal/biometric/login-verify')
        .send({ userId: testUserId });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_parameters');
    });

    it('handles failed attempts and triggers fallback after 3 failures', async () => {
      // First failed attempt
      let res = await request(app)
        .post('/internal/biometric/login-verify')
        .send({
          userId: testUserId,
          assertionResponse: { id: 'invalid-id', response: {} },
        });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(false);
      expect(res.body.attemptsRemaining).toBe(2);

      // Second failed attempt
      res = await request(app)
        .post('/internal/biometric/login-verify')
        .send({
          userId: testUserId,
          assertionResponse: { id: 'invalid-id', response: {} },
        });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(false);
      expect(res.body.attemptsRemaining).toBe(1);

      // Third failed attempt -> fallback to device_passcode
      res = await request(app)
        .post('/internal/biometric/login-verify')
        .send({
          userId: testUserId,
          assertionResponse: { id: 'invalid-id', response: {} },
        });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(false);
      expect(res.body.fallback).toBe('device_passcode');
    });
  });
});
