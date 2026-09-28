// Fake stand-ins for Biometric-Factor and Voice-OTP-Factor, matching the
// internal API shapes in /shared/API_CONTRACT.md sections 2 and 3.
// Use these while building auth-core standalone. Replace with real
// fetch/axios calls to :4001 / :4002 at integration time.

async function mockBiometricLoginVerify(_userId, _assertionResponse) {
  return { passed: true };
}

async function mockVoiceOtpSend(_userId, _phoneNumber) {
  return { otpId: 'mock-otp-id', expiresAt: new Date(Date.now() + 5 * 60000).toISOString(), attemptsRemaining: 3 };
}

async function mockVoiceOtpVerify(_otpId, code) {
  return code === '123456' ? { passed: true } : { passed: false, attemptsRemaining: 2 };
}

module.exports = { mockBiometricLoginVerify, mockVoiceOtpSend, mockVoiceOtpVerify };
