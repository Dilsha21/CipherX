// Base URLs for the internal factor services, per /shared/API_CONTRACT.md.
// Overridable via env for integration/deployment; default to the ports the
// contract assigns each service for local development.
module.exports = {
  biometricFactorUrl: process.env.BIOMETRIC_FACTOR_URL || 'http://localhost:4001',
  voiceOtpFactorUrl: process.env.VOICE_OTP_FACTOR_URL || 'http://localhost:4002',
  // Dev-only default. Integration/deployment must set a real secret via env.
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production',
  sessionTokenTtlSeconds: 60 * 60, // 1 hour
};
