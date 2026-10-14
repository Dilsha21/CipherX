// Client for Auth Core's public API (/shared/API_CONTRACT.md section 1).
// Auth Core is the only service the frontend ever calls.
//
// Requests go to same-origin relative paths: the Vite dev server proxies
// /auth to Auth Core (see vite.config.mjs), and in deployment a reverse
// proxy must do the same behind TLS. That keeps the browser on one origin,
// so no CORS allowance is needed and the CSP can stay at connect-src 'self'.

const MAX_SERVER_MESSAGE_LENGTH = 300;

export class ApiError extends Error {
  constructor(code, { status = 0, body = null } = {}) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.body = body;
    // Plain-language text per the contract's error shape. Only ever rendered
    // with textContent, never as HTML.
    this.serverMessage =
      body && typeof body.message === 'string' ? body.message.slice(0, MAX_SERVER_MESSAGE_LENGTH) : '';
  }
}

const isString = (v) => typeof v === 'string' && v.length > 0;
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

function expect(condition) {
  if (!condition) throw new ApiError('bad_response');
}

export function createAuthCoreClient({
  baseUrl = '',
  fetchImpl = (...args) => globalThis.fetch(...args),
  timeoutMs = 15000,
} = {}) {
  async function post(path, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(baseUrl + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
    } catch (_err) {
      throw new ApiError(controller.signal.aborted ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }

    let body = null;
    try {
      body = await response.json();
    } catch (_err) {
      body = null;
    }

    if (!response.ok) {
      const code = body && isString(body.error) ? body.error : 'http_error';
      throw new ApiError(code, { status: response.status, body });
    }
    if (!body || typeof body !== 'object') {
      throw new ApiError('bad_response', { status: response.status });
    }
    return body;
  }

  return {
    async login(username, password) {
      const body = await post('/auth/login', { username, password });
      expect(isString(body.challengeId) && isStringArray(body.requiredFactors) && isStringArray(body.completedFactors));
      return body;
    },

    // Returns WebAuthn PublicKeyCredentialRequestOptions (JSON).
    biometricChallenge(challengeId) {
      return post('/auth/mfa/biometric/challenge', { challengeId });
    },

    async biometricVerify(challengeId, assertionResponse) {
      const body = await post('/auth/mfa/biometric/verify', { challengeId, assertionResponse });
      expect(body.passed === true && isStringArray(body.completedFactors));
      return body;
    },

    async sendVoiceOtp(challengeId) {
      const body = await post('/auth/mfa/voice-otp/send', { challengeId });
      expect(isString(body.otpId));
      return body;
    },

    // A wrong code is an expected outcome, not a failure of the request, so
    // it resolves with { passed: false, attemptsRemaining } instead of
    // throwing (the contract sends it as a 400).
    async verifyVoiceOtp(challengeId, otpId, code) {
      let body;
      try {
        body = await post('/auth/mfa/voice-otp/verify', { challengeId, otpId, code });
      } catch (err) {
        if (err instanceof ApiError && err.status === 400 && err.body && err.body.passed === false) {
          return err.body;
        }
        throw err;
      }
      expect(body.passed === true && isStringArray(body.completedFactors));
      return body;
    },

    async finalizeSession(challengeId) {
      const body = await post('/auth/session/finalize', { challengeId });
      expect(isString(body.sessionToken));
      return body;
    },
  };
}
