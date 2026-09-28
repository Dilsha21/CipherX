const express = require('express');

const app = express();
app.use(express.json());

// TODO(Member B): implement per /shared/API_CONTRACT.md section 2, using
// @simplewebauthn/server for options-generation and verification.
// - POST /internal/biometric/register-options
// - POST /internal/biometric/register-verify
// - POST /internal/biometric/login-options
// - POST /internal/biometric/login-verify   (3-strikes -> fallback: "device_passcode")

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'biometric-factor' }));

const PORT = process.env.PORT || 4001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`biometric-factor listening on :${PORT}`));
}

module.exports = app;
