const express = require('express');

const app = express();
app.use(express.json());

// TODO(Member A): implement per /shared/API_CONTRACT.md section 1
// - POST /auth/register
// - POST /auth/login
// - POST /auth/mfa/biometric/challenge  (proxy to Biometric-Factor)
// - POST /auth/mfa/biometric/verify     (proxy to Biometric-Factor)
// - POST /auth/mfa/voice-otp/send       (proxy to Voice-OTP-Factor)
// - POST /auth/mfa/voice-otp/verify     (proxy to Voice-OTP-Factor)
// - POST /auth/session/finalize

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-core' }));

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`auth-core listening on :${PORT}`));
}

module.exports = app;
