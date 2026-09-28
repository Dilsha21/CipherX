const axios = require('axios');
const { voiceOtpFactorUrl } = require('../config');

const client = axios.create({ baseURL: voiceOtpFactorUrl, timeout: 5000 });

// Per /shared/API_CONTRACT.md section 3.
async function sendCode(userId, phoneNumber) {
  const { data } = await client.post('/internal/voice-otp/send', { userId, phoneNumber });
  return data; // { otpId, expiresAt, attemptsRemaining }
}

async function verifyCode(otpId, code) {
  const { data } = await client.post('/internal/voice-otp/verify', { otpId, code });
  return data; // { passed: boolean, attemptsRemaining? }
}

module.exports = { sendCode, verifyCode };
