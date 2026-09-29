const { requireIdentifier, requirePositiveInteger } = require('./lib/validate');
const { SecurityAdminError } = require('./lib/errors');

class SecurityService {
  constructor({ store, audit, clock = Date.now, callWindowMs = 10 * 60_000, maxCalls = 3, maxSourceCalls = 10, maxOtpAttempts = 3 }) {
    if (!store) throw new TypeError('A security store is required.');
    this.store = store;
    this.audit = audit;
    this.clock = clock;
    this.callWindowMs = requirePositiveInteger(callWindowMs, 'callWindowMs');
    this.maxCalls = requirePositiveInteger(maxCalls, 'maxCalls');
    this.maxSourceCalls = requirePositiveInteger(maxSourceCalls, 'maxSourceCalls');
    this.maxOtpAttempts = requirePositiveInteger(maxOtpAttempts, 'maxOtpAttempts');
  }

  checkVoiceCall({ accountId, attemptId, sourceId, activeAttempt, precedingFactorsPassed }) {
    requireIdentifier(accountId, 'accountId');
    requireIdentifier(attemptId, 'attemptId');
    if (sourceId != null) requireIdentifier(sourceId, 'sourceId');
    if (activeAttempt !== true || precedingFactorsPassed !== true) {
      return this._callDecision({ accountId, attemptId, allowed: false, reason: 'login_attempt_not_eligible', retryAfter: 0 });
    }

    try {
      const now = this.clock();
      const account = this.store.consumeWindow(`call:account:${accountId}`, { now, windowMs: this.callWindowMs, max: this.maxCalls });
      if (!account.allowed) return this._callDecision({ accountId, attemptId, allowed: false, reason: 'account_rate_limited', retryAfter: secondsUntil(account.resetAt, now) });

      if (sourceId) {
        const source = this.store.consumeWindow(`call:source:${sourceId}`, { now, windowMs: this.callWindowMs, max: this.maxSourceCalls });
        if (!source.allowed) return this._callDecision({ accountId, attemptId, allowed: false, reason: 'source_rate_limited', retryAfter: secondsUntil(source.resetAt, now) });
      }
      return this._callDecision({ accountId, attemptId, allowed: true, reason: 'allowed', retryAfter: 0, remaining: account.remaining });
    } catch (cause) {
      this._audit({ accountId, attemptId, eventType: 'security_error', factor: 'voice_otp', outcome: 'error', reasonCode: 'security_store_unavailable' });
      throw unavailable(cause);
    }
  }

  registerOtp({ accountId, attemptId, otpId, expiresAt }) {
    requireIdentifier(accountId, 'accountId');
    requireIdentifier(attemptId, 'attemptId');
    requireIdentifier(otpId, 'otpId');
    const expiry = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= this.clock()) throw new TypeError('expiresAt must be a future time.');
    try {
      return this.store.registerOtp({ accountId, attemptId, otpId, expiresAt: expiry, maxAttempts: this.maxOtpAttempts });
    } catch (cause) {
      throw unavailable(cause);
    }
  }

  checkOtpAttempt({ accountId, attemptId, otpId }) {
    requireIdentifier(accountId, 'accountId');
    requireIdentifier(attemptId, 'attemptId');
    requireIdentifier(otpId, 'otpId');
    try {
      const decision = this.store.consumeOtpAttempt({ accountId, attemptId, otpId, now: this.clock() });
      this._audit({ accountId, attemptId, eventType: 'rate_limit', factor: 'voice_otp', outcome: decision.allowed ? 'allowed' : 'denied', reasonCode: decision.reason });
      return decision;
    } catch (cause) {
      throw unavailable(cause);
    }
  }

  recordOtpOutcome({ accountId, attemptId, outcome, reasonCode }) {
    requireIdentifier(accountId, 'accountId');
    requireIdentifier(attemptId, 'attemptId');
    if (!['success', 'failure'].includes(outcome)) throw new TypeError('outcome must be success or failure.');
    if (outcome === 'success') this.store.consumeOtp(attemptId);
    return this._audit({ accountId, attemptId, eventType: 'otp_verification', factor: 'voice_otp', outcome, reasonCode });
  }

  _callDecision(decision) {
    this._audit({ accountId: decision.accountId, attemptId: decision.attemptId, eventType: 'rate_limit', factor: 'voice_otp', outcome: decision.allowed ? 'allowed' : 'denied', reasonCode: decision.reason });
    return { allowed: decision.allowed, reason: decision.reason, retryAfter: decision.retryAfter, ...(decision.remaining == null ? {} : { remaining: decision.remaining }) };
  }

  _audit(event) {
    return this.audit ? this.audit(event) : { recorded: false };
  }
}

function secondsUntil(resetAt, now) {
  return Math.max(0, Math.ceil((resetAt - now) / 1000));
}

function unavailable(cause) {
  const error = new SecurityAdminError('security_store_unavailable', 'The security decision could not be completed.', 503);
  error.cause = cause;
  return error;
}

module.exports = { SecurityService };
