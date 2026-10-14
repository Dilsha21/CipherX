const fs = require('fs');
const path = require('path');
const { ApiError } = require('../src/api.js');
const { createApp } = require('../src/flow.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const LOGIN_OK = { challengeId: 'c-1', requiredFactors: ['biometric', 'voice_otp'], completedFactors: [] };
const inFiveMinutes = () => new Date(Date.now() + 5 * 60 * 1000).toISOString();

// Loads the real index.html into Jest's jsdom document and starts the app
// against a fake Auth Core client that walks the happy path by default.
function mountApp(overrides = {}) {
  document.documentElement.innerHTML = html;

  const api = {
    login: jest.fn().mockResolvedValue(LOGIN_OK),
    biometricChallenge: jest.fn().mockResolvedValue({ challenge: 'AAAA' }),
    biometricVerify: jest.fn().mockResolvedValue({ passed: true, completedFactors: ['biometric'] }),
    sendVoiceOtp: jest.fn().mockImplementation(async () => ({
      otpId: 'o-1',
      expiresAt: inFiveMinutes(),
      attemptsRemaining: 3,
    })),
    verifyVoiceOtp: jest.fn().mockResolvedValue({ passed: true, completedFactors: ['biometric', 'voice_otp'] }),
    finalizeSession: jest.fn().mockResolvedValue({ sessionToken: 'jwt', expiresAt: inFiveMinutes() }),
    ...overrides.api,
  };
  const webauthn = {
    isWebAuthnSupported: jest.fn().mockReturnValue(true),
    getAssertion: jest.fn().mockResolvedValue({ id: 'cred' }),
    ...overrides.webauthn,
  };
  const session = { setSession: jest.fn(), clearSession: jest.fn() };

  createApp({ doc: document, api, webauthn, session });
  return { api, webauthn, session };
}

const $ = (id) => document.getElementById(id);
const flush = async () => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};
const visibleScreen = () => document.querySelector('[data-screen]:not([hidden])').dataset.screen;
const statusText = () => $('status').textContent;
const errorText = () => $('error').textContent;

async function submitSignIn(username = 'demo', password = 'pw') {
  $('username').value = username;
  $('password').value = password;
  $('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
  await flush();
}

async function click(id) {
  $(id).click();
  await flush();
}

async function submitCode(code) {
  $('code').value = code;
  $('code-form').dispatchEvent(new Event('submit', { cancelable: true }));
  await flush();
}

async function reachCodeScreen() {
  await submitSignIn();
  await click('biometric-start');
  await click('calling-continue');
}

const apiError = (code, status, body = {}) => new ApiError(code, { status, body: { error: code, ...body } });

module.exports = {
  mountApp, $, flush, visibleScreen, statusText, errorText,
  submitSignIn, click, submitCode, reachCodeScreen, apiError,
};
