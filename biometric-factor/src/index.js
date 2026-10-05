const express = require('express');
const biometricService = require('./biometricService');
const { rateLimiter } = require('./securityStub');

const app = express();
app.use(express.json());
app.use(rateLimiter());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'biometric-factor' });
});

/**
 * POST /internal/biometric/register-options
 * Generate WebAuthn PublicKeyCredentialCreationOptions
 */
app.post('/internal/biometric/register-options', async (req, res) => {
  try {
    const { userId, userName } = req.body || {};
    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'A valid userId is required to generate registration options.',
      });
    }

    const options = await biometricService.generateRegisterOptions(userId, userName);
    return res.json(options);
  } catch (error) {
    console.error('Error in /register-options:', error);
    return res.status(500).json({
      error: 'registration_options_failed',
      message: error.message || 'Failed to generate registration options.',
    });
  }
});

/**
 * POST /internal/biometric/register-verify
 * Verify WebAuthn attestation response and store public key
 */
app.post('/internal/biometric/register-verify', async (req, res) => {
  try {
    const { userId, attestationResponse } = req.body || {};
    if (!userId || !attestationResponse) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'Both userId and attestationResponse are required.',
      });
    }

    const result = await biometricService.verifyRegisterResponse(userId, attestationResponse);
    return res.json(result);
  } catch (error) {
    console.error('Error in /register-verify:', error);
    return res.status(400).json({
      error: 'attestation_verification_failed',
      message: error.message || 'Biometric attestation verification failed.',
    });
  }
});

/**
 * POST /internal/biometric/login-options
 * Generate WebAuthn PublicKeyCredentialRequestOptions
 */
app.post('/internal/biometric/login-options', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'A valid userId is required to generate login options.',
      });
    }

    const options = await biometricService.generateLoginOptions(userId);
    return res.json(options);
  } catch (error) {
    console.error('Error in /login-options:', error);
    return res.status(500).json({
      error: 'login_options_failed',
      message: error.message || 'Failed to generate login options.',
    });
  }
});

/**
 * POST /internal/biometric/login-verify
 * Verify WebAuthn assertion response and enforce 3-strikes fallback rule
 */
app.post('/internal/biometric/login-verify', async (req, res) => {
  try {
    const { userId, assertionResponse } = req.body || {};
    if (!userId || !assertionResponse) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'Both userId and assertionResponse are required.',
      });
    }

    const result = await biometricService.verifyLoginResponse(userId, assertionResponse);
    return res.json(result);
  } catch (error) {
    console.error('Error in /login-verify:', error);
    return res.status(500).json({
      error: 'assertion_verification_error',
      message: error.message || 'An unexpected error occurred during assertion verification.',
    });
  }
});

const PORT = process.env.PORT || 4001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`biometric-factor listening on :${PORT}`));
}

module.exports = app;
