// Drives the login journey: one screen per step, each announced on entry
// (WCAG SC 4.1.3), errors announced immediately in plain language with a
// suggested fix (SC 3.3.1 / 3.3.3).
//
// The frontend never decides that a factor passed. It only reflects what
// Auth Core reports; the local counters here exist for wording, not security.

import { ApiError } from './api.js';
import {
  ANNOUNCE,
  ERRORS,
  STATUS,
  TITLES,
  biometricRetry,
  codeMismatch,
  codeValidUntil,
  rateLimited,
} from './messages.js';

const MAX_BIOMETRIC_TRIES = 3;
const EXPIRY_WARNING_MS = 60 * 1000;
const CODE_PATTERN = /^\d{6}$/;

export function createApp({ doc, api, webauthn, session }) {
  const $ = (id) => doc.getElementById(id);
  const screens = Array.from(doc.querySelectorAll('[data-screen]'));
  const statusRegion = $('status');
  const errorRegion = $('error');
  const fields = [$('username'), $('password'), $('code')];

  let current = 'signIn';
  let busy = false;
  let expiryTimers = [];
  let attempt = newAttempt();

  function newAttempt() {
    return { challengeId: null, requiredFactors: [], completedFactors: [], otpId: null, biometricFailures: 0 };
  }

  // --- announcements -------------------------------------------------------

  // A fresh node each time, so repeating the same sentence is still spoken.
  function setRegionText(region, text) {
    const p = doc.createElement('p');
    p.textContent = text;
    region.replaceChildren(p);
  }

  function announce(text) {
    setRegionText(statusRegion, text);
  }

  function clearError() {
    errorRegion.replaceChildren();
    fields.forEach((field) => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
  }

  function showError(text, field) {
    clearError();
    setRegionText(errorRegion, `Error: ${text}`);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', 'error');
      field.focus();
    }
  }

  // --- screens -------------------------------------------------------------

  function showScreen(name, { announcement = ANNOUNCE[name], focus } = {}) {
    current = name;
    clearError();
    screens.forEach((screen) => {
      screen.hidden = screen.dataset.screen !== name;
    });
    doc.title = TITLES[name];
    const target = focus || screens.find((s) => s.dataset.screen === name).querySelector('h1');
    target.focus();
    if (announcement) announce(announcement);
  }

  function clearExpiryTimers() {
    expiryTimers.forEach(clearTimeout);
    expiryTimers = [];
  }

  function restart(errorText) {
    clearExpiryTimers();
    attempt = newAttempt();
    $('password').value = '';
    $('code').value = '';
    showScreen('signIn', { focus: $('username') });
    if (errorText) showError(errorText, $('username'));
  }

  function stop(message) {
    clearExpiryTimers();
    attempt = newAttempt();
    $('stopped-message').textContent = message;
    showScreen('stopped', { announcement: message });
  }

  // --- error handling ------------------------------------------------------

  function describe(err) {
    if (!(err instanceof ApiError)) return ERRORS.generic;
    if (err.status === 429 || err.code === 'rate_limited') {
      return rateLimited(err.body && err.body.retryAfter);
    }
    if (['network', 'timeout', 'bad_response'].includes(err.code) || err.status >= 500) {
      return ERRORS.unavailable;
    }
    return err.serverMessage || ERRORS.generic;
  }

  function fail(err, field) {
    if (err instanceof ApiError && err.code === 'invalid_challenge') {
      restart(ERRORS.attemptExpired);
      return;
    }
    showError(describe(err), field);
  }

  // Ignores repeat activations while a request is in flight. aria-disabled
  // (not `disabled`) so the button keeps focus and stays discoverable.
  async function guarded(button, task) {
    if (busy) return;
    busy = true;
    button.setAttribute('aria-disabled', 'true');
    try {
      await task();
    } catch (err) {
      fail(err);
    } finally {
      busy = false;
      button.removeAttribute('aria-disabled');
    }
  }

  // --- steps ---------------------------------------------------------------

  async function advance() {
    const next = attempt.requiredFactors.find((factor) => !attempt.completedFactors.includes(factor));
    if (!next) return finalize();
    if (next === 'biometric') return showScreen('biometric');
    if (next === 'voice_otp') return startCall();
    return stop(ERRORS.unknownFactor);
  }

  async function signIn() {
    const username = $('username').value.trim();
    const passwordField = $('password');
    const password = passwordField.value;
    if (!username || !password) {
      showError(ERRORS.missingCredentials, username ? passwordField : $('username'));
      return;
    }
    clearError();

    let result;
    try {
      result = await api.login(username, password);
    } catch (err) {
      passwordField.value = '';
      if (err instanceof ApiError && err.code === 'invalid_credentials') {
        showError(ERRORS.invalidCredentials, passwordField);
        return;
      }
      fail(err, passwordField);
      return;
    }
    // The password has done its job; don't leave it sitting in the DOM.
    passwordField.value = '';

    attempt = { ...newAttempt(), ...result };
    await advance();
  }

  async function biometric() {
    if (!webauthn.isWebAuthnSupported()) {
      showError(ERRORS.biometricUnsupported);
      return;
    }
    clearError();
    const options = await api.biometricChallenge(attempt.challengeId);

    let assertion;
    try {
      assertion = await webauthn.getAssertion(options);
    } catch (_err) {
      // Cancelled, timed out, or no matching credential on this device. The
      // server never saw an attempt, so it doesn't count as a strike.
      showError(ERRORS.biometricCancelled);
      return;
    }

    let result;
    try {
      result = await api.biometricVerify(attempt.challengeId, assertion);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'factor_failed') {
        attempt.biometricFailures += 1;
        const remaining = MAX_BIOMETRIC_TRIES - attempt.biometricFailures;
        if (remaining <= 0) stop(ERRORS.biometricStopped);
        else showError(biometricRetry(remaining));
        return;
      }
      throw err;
    }

    attempt.completedFactors = result.completedFactors;
    await advance();
  }

  function scheduleExpiry(expiresAtIso) {
    clearExpiryTimers();
    const expiresAt = Date.parse(expiresAtIso);
    if (Number.isNaN(expiresAt)) {
      $('code-expiry').textContent = '';
      return;
    }
    $('code-expiry').textContent = codeValidUntil(new Date(expiresAt));

    // Timing (SC 2.2.1): warn before expiry, never navigate away or discard
    // input when time runs out, and always offer a new code.
    const msLeft = expiresAt - Date.now();
    if (msLeft > EXPIRY_WARNING_MS) {
      expiryTimers.push(
        setTimeout(() => {
          if (current === 'code' || current === 'calling') announce(STATUS.codeExpiringSoon);
        }, msLeft - EXPIRY_WARNING_MS),
      );
    }
    expiryTimers.push(
      setTimeout(() => {
        if (current === 'code' || current === 'calling') showError(ERRORS.codeExpired);
      }, Math.max(msLeft, 0)),
    );
  }

  async function startCall() {
    clearExpiryTimers();
    attempt.otpId = null;
    $('code').value = '';
    $('calling-continue').hidden = true;
    $('calling-retry').hidden = true;
    showScreen('calling');

    try {
      const result = await api.sendVoiceOtp(attempt.challengeId);
      attempt.otpId = result.otpId;
      scheduleExpiry(result.expiresAt);
      $('calling-continue').hidden = false;
    } finally {
      // Present after success too: the call may simply never arrive.
      $('calling-retry').hidden = false;
    }
  }

  async function verifyCode() {
    const codeField = $('code');
    const code = codeField.value.replace(/\s+/g, '');
    if (!CODE_PATTERN.test(code)) {
      showError(ERRORS.codeFormat, codeField);
      return;
    }
    clearError();

    let result;
    try {
      result = await api.verifyVoiceOtp(attempt.challengeId, attempt.otpId, code);
    } catch (err) {
      fail(err, codeField);
      return;
    }

    if (!result.passed) {
      codeField.value = '';
      showError(codeMismatch(result.attemptsRemaining), codeField);
      return;
    }

    attempt.completedFactors = result.completedFactors;
    await advance();
  }

  async function finalize() {
    let result;
    try {
      result = await api.finalizeSession(attempt.challengeId);
    } catch (err) {
      // Auth Core is the authority on which factors have passed. If it says
      // one is still missing, go and do that one rather than arguing.
      const missing = err instanceof ApiError && err.code === 'factors_incomplete' && err.body && err.body.missing;
      if (Array.isArray(missing) && missing.length > 0) {
        attempt.completedFactors = attempt.requiredFactors.filter((factor) => !missing.includes(factor));
        return advance();
      }
      throw err;
    }
    clearExpiryTimers();
    session.setSession(result);
    attempt = newAttempt();
    showScreen('success');
  }

  // --- wiring --------------------------------------------------------------

  $('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    guarded($('sign-in-button'), signIn);
  });

  $('biometric-start').addEventListener('click', (event) => guarded(event.currentTarget, biometric));

  $('calling-continue').addEventListener('click', () => {
    if (!busy) showScreen('code', { focus: $('code') });
  });
  $('calling-retry').addEventListener('click', (event) => guarded(event.currentTarget, startCall));

  $('code-form').addEventListener('submit', (event) => {
    event.preventDefault();
    guarded($('code-verify'), verifyCode);
  });
  $('code-repeat').addEventListener('click', (event) => guarded(event.currentTarget, startCall));

  $('sign-out').addEventListener('click', () => {
    session.clearSession();
    restart();
    announce(STATUS.signedOut);
  });

  doc.querySelectorAll('[data-action="restart"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!busy) restart();
    });
  });

  // Initial state. Focus is left alone on first load so the screen reader
  // reads the page from the top as it would any newly opened page.
  screens.forEach((screen) => {
    screen.hidden = screen.dataset.screen !== 'signIn';
  });
  doc.title = TITLES.signIn;
  announce(ANNOUNCE.signIn);
}
