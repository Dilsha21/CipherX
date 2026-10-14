const {
  base64urlToBuffer, bufferToBase64url, decodeRequestOptions, encodeAssertion, getAssertion, isWebAuthnSupported,
} = require('../src/webauthn.js');

const bytes = (...values) => new Uint8Array(values).buffer;

describe('webauthn helpers', () => {
  it('round-trips base64url, including the URL-safe alphabet and missing padding', () => {
    const buffer = bytes(251, 255, 254, 0, 1);
    const encoded = bufferToBase64url(buffer);
    expect(encoded).toBe('-__-AAE');
    expect(new Uint8Array(base64urlToBuffer(encoded))).toEqual(new Uint8Array(buffer));
  });

  it('decodes the challenge and credential ids, leaving other options untouched', () => {
    const options = decodeRequestOptions({
      challenge: 'AQID',
      rpId: 'localhost',
      userVerification: 'required',
      allowCredentials: [{ id: 'BAUG', type: 'public-key', transports: ['internal'] }],
    });
    expect(new Uint8Array(options.challenge)).toEqual(new Uint8Array([1, 2, 3]));
    expect(new Uint8Array(options.allowCredentials[0].id)).toEqual(new Uint8Array([4, 5, 6]));
    expect(options).toMatchObject({ rpId: 'localhost', userVerification: 'required' });
    expect(options.allowCredentials[0].transports).toEqual(['internal']);
  });

  it('accepts options wrapped in publicKey, and rejects options with no challenge', () => {
    expect(new Uint8Array(decodeRequestOptions({ publicKey: { challenge: 'AQID' } }).challenge)).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(() => decodeRequestOptions({})).toThrow(TypeError);
  });

  const credential = {
    id: 'cred-id',
    rawId: bytes(1),
    type: 'public-key',
    authenticatorAttachment: 'platform',
    response: {
      clientDataJSON: bytes(2),
      authenticatorData: bytes(3),
      signature: bytes(4),
      userHandle: null,
    },
    getClientExtensionResults: () => ({}),
  };

  it('serialises an assertion into the JSON shape @simplewebauthn/server verifies', () => {
    expect(encodeAssertion(credential)).toEqual({
      id: 'cred-id',
      rawId: 'AQ',
      type: 'public-key',
      response: { clientDataJSON: 'Ag', authenticatorData: 'Aw', signature: 'BA', userHandle: undefined },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    });
  });

  it('getAssertion calls navigator.credentials.get with decoded options', async () => {
    const credentials = { get: jest.fn().mockResolvedValue(credential) };
    const result = await getAssertion({ challenge: 'AQID' }, { credentials });
    expect(new Uint8Array(credentials.get.mock.calls[0][0].publicKey.challenge)).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.id).toBe('cred-id');
  });

  it('getAssertion rejects when the device returns nothing', async () => {
    const credentials = { get: jest.fn().mockResolvedValue(null) };
    await expect(getAssertion({ challenge: 'AQID' }, { credentials })).rejects.toThrow();
  });

  it('detects WebAuthn support', () => {
    expect(isWebAuthnSupported({})).toBe(false);
    expect(isWebAuthnSupported({ PublicKeyCredential: function PKC() {}, navigator: { credentials: {} } })).toBe(true);
  });
});
