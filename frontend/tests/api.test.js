const { ApiError, createAuthCoreClient } = require('../src/api.js');

const respond = (status, body) =>
  jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('Auth Core client', () => {
  it('posts JSON to a same-origin path with conservative fetch options', async () => {
    const fetchImpl = respond(200, { challengeId: 'c', requiredFactors: ['biometric'], completedFactors: [] });
    await createAuthCoreClient({ fetchImpl }).login('demo', 'pw');

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/auth/login');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ username: 'demo', password: 'pw' });
  });

  it('uses the request shapes from the contract', async () => {
    const fetchImpl = respond(200, {
      passed: true, completedFactors: [], otpId: 'o', sessionToken: 't', expiresAt: 'x',
    });
    const client = createAuthCoreClient({ fetchImpl });
    await client.biometricChallenge('c');
    await client.biometricVerify('c', { id: 'a' });
    await client.sendVoiceOtp('c');
    await client.verifyVoiceOtp('c', 'o', '123456');
    await client.finalizeSession('c');

    expect(fetchImpl.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)])).toEqual([
      ['/auth/mfa/biometric/challenge', { challengeId: 'c' }],
      ['/auth/mfa/biometric/verify', { challengeId: 'c', assertionResponse: { id: 'a' } }],
      ['/auth/mfa/voice-otp/send', { challengeId: 'c' }],
      ['/auth/mfa/voice-otp/verify', { challengeId: 'c', otpId: 'o', code: '123456' }],
      ['/auth/session/finalize', { challengeId: 'c' }],
    ]);
  });

  it('turns the contract error shape into an ApiError', async () => {
    const fetchImpl = respond(401, { error: 'invalid_credentials', message: 'Nope.' });
    const err = await createAuthCoreClient({ fetchImpl }).login('a', 'b').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'invalid_credentials', status: 401, serverMessage: 'Nope.' });
  });

  it('resolves a wrong code as passed:false rather than throwing', async () => {
    const fetchImpl = respond(400, { factor: 'voice_otp', passed: false, attemptsRemaining: 2 });
    const result = await createAuthCoreClient({ fetchImpl }).verifyVoiceOtp('c', 'o', '000000');
    expect(result).toMatchObject({ passed: false, attemptsRemaining: 2 });
  });

  it('still throws on other 400s from the verify endpoint', async () => {
    const fetchImpl = respond(400, { error: 'invalid_challenge', message: 'Expired.' });
    await expect(createAuthCoreClient({ fetchImpl }).verifyVoiceOtp('c', 'o', '1')).rejects.toMatchObject({
      code: 'invalid_challenge',
    });
  });

  it('rejects a success response that does not match the contract', async () => {
    const fetchImpl = respond(200, { challengeId: 42 });
    await expect(createAuthCoreClient({ fetchImpl }).login('a', 'b')).rejects.toMatchObject({ code: 'bad_response' });
  });

  it('reports network failures and timeouts distinctly', async () => {
    const offline = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(createAuthCoreClient({ fetchImpl: offline }).login('a', 'b')).rejects.toMatchObject({
      code: 'network',
    });

    const hangs = jest.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    await expect(createAuthCoreClient({ fetchImpl: hangs, timeoutMs: 5 }).login('a', 'b')).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('handles a non-JSON error body', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false, status: 502, json: async () => { throw new SyntaxError('not json'); },
    });
    await expect(createAuthCoreClient({ fetchImpl }).login('a', 'b')).rejects.toMatchObject({
      code: 'http_error', status: 502,
    });
  });
});
