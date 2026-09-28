const nock = require('nock');
const { voiceOtpFactorUrl } = require('../../src/config');
const { sendCode, verifyCode } = require('../../src/services/voiceOtpFactorClient');

describe('voiceOtpFactorClient', () => {
  afterEach(() => nock.cleanAll());

  it('sends a code and returns otpId/expiresAt/attemptsRemaining', async () => {
    nock(voiceOtpFactorUrl)
      .post('/internal/voice-otp/send', { userId: 'user-1', phoneNumber: '+94770000000' })
      .reply(200, { otpId: 'otp-1', expiresAt: '2026-01-01T00:05:00.000Z', attemptsRemaining: 3 });

    const result = await sendCode('user-1', '+94770000000');
    expect(result).toEqual({ otpId: 'otp-1', expiresAt: '2026-01-01T00:05:00.000Z', attemptsRemaining: 3 });
  });

  it('verifies a correct code as passed:true', async () => {
    nock(voiceOtpFactorUrl)
      .post('/internal/voice-otp/verify', { otpId: 'otp-1', code: '123456' })
      .reply(200, { passed: true });

    const result = await verifyCode('otp-1', '123456');
    expect(result).toEqual({ passed: true });
  });

  it('verifies an incorrect code as passed:false with attemptsRemaining', async () => {
    nock(voiceOtpFactorUrl)
      .post('/internal/voice-otp/verify')
      .reply(200, { passed: false, attemptsRemaining: 2 });

    const result = await verifyCode('otp-1', '000000');
    expect(result).toEqual({ passed: false, attemptsRemaining: 2 });
  });
});
