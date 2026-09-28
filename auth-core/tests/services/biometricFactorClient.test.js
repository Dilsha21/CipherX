const nock = require('nock');
const { biometricFactorUrl } = require('../../src/config');
const { requestLoginOptions, verifyLoginAssertion } = require('../../src/services/biometricFactorClient');

describe('biometricFactorClient', () => {
  afterEach(() => nock.cleanAll());

  it('requests login options for a user', async () => {
    nock(biometricFactorUrl)
      .post('/internal/biometric/login-options', { userId: 'user-1' })
      .reply(200, { challenge: 'base64-challenge' });

    const result = await requestLoginOptions('user-1');
    expect(result).toEqual({ challenge: 'base64-challenge' });
  });

  it('verifies a login assertion and returns passed:true', async () => {
    nock(biometricFactorUrl)
      .post('/internal/biometric/login-verify', { userId: 'user-1', assertionResponse: { sig: 'abc' } })
      .reply(200, { passed: true });

    const result = await verifyLoginAssertion('user-1', { sig: 'abc' });
    expect(result).toEqual({ passed: true });
  });

  it('propagates a failed verification with fallback info', async () => {
    nock(biometricFactorUrl)
      .post('/internal/biometric/login-verify')
      .reply(200, { passed: false, fallback: 'device_passcode' });

    const result = await verifyLoginAssertion('user-1', { sig: 'bad' });
    expect(result).toEqual({ passed: false, fallback: 'device_passcode' });
  });
});
