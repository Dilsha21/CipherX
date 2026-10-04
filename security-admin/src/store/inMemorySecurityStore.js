class InMemorySecurityStore {
  constructor() {
    this.windows = new Map();
    this.otpAttempts = new Map();
    this.auditEvents = [];
    this.auditEventIds = new Set();
  }

  consumeWindow(key, { now, windowMs, max }) {
    let state = this.windows.get(key);
    if (!state || now >= state.resetAt) {
      state = { count: 0, resetAt: now + windowMs };
    }

    if (state.count >= max) {
      this.windows.set(key, state);
      return { allowed: false, remaining: 0, resetAt: state.resetAt };
    }

    state.count += 1;
    this.windows.set(key, state);
    return { allowed: true, remaining: max - state.count, resetAt: state.resetAt };
  }

  registerOtp({ accountId, attemptId, otpId, expiresAt, maxAttempts }) {
    const existing = this.otpAttempts.get(attemptId);
    if (existing && existing.otpId === otpId) return { ...existing };

    const state = { accountId, attemptId, otpId, expiresAt, maxAttempts, used: 0, consumed: false };
    this.otpAttempts.set(attemptId, state);
    return { ...state };
  }

  consumeOtpAttempt({ accountId, attemptId, otpId, now }) {
    const state = this.otpAttempts.get(attemptId);
    if (!state || state.accountId !== accountId || state.otpId !== otpId) {
      return { allowed: false, reason: 'otp_attempt_mismatch', attemptsRemaining: 0 };
    }
    if (state.consumed) {
      return { allowed: false, reason: 'otp_already_consumed', attemptsRemaining: 0 };
    }
    if (now >= state.expiresAt) {
      return { allowed: false, reason: 'otp_expired', attemptsRemaining: 0 };
    }
    if (state.used >= state.maxAttempts) {
      return { allowed: false, reason: 'otp_attempts_exhausted', attemptsRemaining: 0 };
    }

    state.used += 1;
    this.otpAttempts.set(attemptId, state);
    return { allowed: true, reason: 'allowed', attemptsRemaining: state.maxAttempts - state.used };
  }

  consumeOtp(attemptId) {
    const state = this.otpAttempts.get(attemptId);
    if (state) {
      state.consumed = true;
      this.otpAttempts.set(attemptId, state);
    }
  }

  appendAuditEvent(event) {
    if (event.eventId && this.auditEventIds.has(event.eventId)) return false;
    this.auditEvents.push(Object.freeze({ ...event }));
    if (event.eventId) this.auditEventIds.add(event.eventId);
    return true;
  }

  queryAuditEvents({ accountId, since } = {}) {
    return this.auditEvents
      .filter((event) => !accountId || event.accountId === accountId)
      .filter((event) => !since || Date.parse(event.timestamp) >= since)
      .map((event) => ({ ...event }));
  }

  reset() {
    this.windows.clear();
    this.otpAttempts.clear();
    this.auditEvents.length = 0;
    this.auditEventIds.clear();
  }
}

module.exports = { InMemorySecurityStore };
