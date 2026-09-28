const axios = require('axios');
const { biometricFactorUrl } = require('../config');

const client = axios.create({ baseURL: biometricFactorUrl, timeout: 5000 });

// Per /shared/API_CONTRACT.md section 2. Auth Core never trusts the
// client's word that a factor passed — it always asks Biometric-Factor
// server-to-server.
async function requestLoginOptions(userId) {
  const { data } = await client.post('/internal/biometric/login-options', { userId });
  return data;
}

async function verifyLoginAssertion(userId, assertionResponse) {
  const { data } = await client.post('/internal/biometric/login-verify', { userId, assertionResponse });
  return data; // { passed: boolean, fallback?: string }
}

module.exports = { requestLoginOptions, verifyLoginAssertion };
