const { createSecurityModule } = require('../src');

describe('SecurityService', () => {
  let now;
  let module;
  let service;

  beforeEach(() => {
    now = Date.parse('2026-01-01T00:00:00.000Z');
    module = createSecurityModule({ clock: () => now, callWindowMs: 1000, maxCalls: 2, maxSourceCalls: 2, maxOtpAttempts: 3 });
    service = module.securityService;
  });

  const call = (overrides = {}) => service.checkVoiceCall({
    accountId: 'acct-1', attemptId: 'attempt-1', sourceId: 'device-1',
    activeAttempt: true, precedingFactorsPassed: true, ...overrides,
  });

  it('allows calls up to the account limit and returns retry-after when blocked', () => {
    expect(call()).toMatchObject({ allowed: true, remaining: 1 });
    expect(call()).toMatchObject({ allowed: true, remaining: 0 });
    expect(call()).toEqual({ allowed: false, reason: 'account_rate_limited', retryAfter: 1 });
  });

  it('resets exactly at the window boundary', () => {
    call(); call();
    now += 999;
    expect(call().allowed).toBe(false);
    now += 1;
    expect(call()).toMatchObject({ allowed: true, remaining: 1 });
  });

  it('denies calls without an active eligible login attempt', () => {
    expect(call({ activeAttempt: false })).toMatchObject({ allowed: false, reason: 'login_attempt_not_eligible' });
    expect(call({ precedingFactorsPassed: false })).toMatchObject({ allowed: false, reason: 'login_attempt_not_eligible' });
  });

  it('rejects malformed identifiers', () => {
    expect(() => call({ accountId: '' })).toThrow(/accountId/);
    expect(() => call({ attemptId: 'contains spaces' })).toThrow(/attemptId/);
  });

  it('applies a separate trusted-source limit', () => {
    expect(call({ accountId: 'acct-1' }).allowed).toBe(true);
    expect(call({ accountId: 'acct-2' }).allowed).toBe(true);
    expect(call({ accountId: 'acct-3' })).toMatchObject({ allowed: false, reason: 'source_rate_limited' });
  });

  it('preserves the OTP counter for a resend of the same otpId', () => {
    const registration = { accountId: 'acct-1', attemptId: 'attempt-1', otpId: 'otp-1', expiresAt: now + 5000 };
    service.registerOtp(registration);
    expect(service.checkOtpAttempt(registration).attemptsRemaining).toBe(2);
    service.registerOtp(registration);
    expect(service.checkOtpAttempt(registration).attemptsRemaining).toBe(1);
  });

  it('permits exactly the configured number of guesses', () => {
    const ids = { accountId: 'acct-1', attemptId: 'attempt-1', otpId: 'otp-1' };
    service.registerOtp({ ...ids, expiresAt: now + 5000 });
    expect(service.checkOtpAttempt(ids).allowed).toBe(true);
    expect(service.checkOtpAttempt(ids).allowed).toBe(true);
    expect(service.checkOtpAttempt(ids)).toMatchObject({ allowed: true, attemptsRemaining: 0 });
    expect(service.checkOtpAttempt(ids)).toEqual({ allowed: false, reason: 'otp_attempts_exhausted', attemptsRemaining: 0 });
  });

  it('blocks expired, cross-account, and cross-attempt use', () => {
    const ids = { accountId: 'acct-1', attemptId: 'attempt-1', otpId: 'otp-1' };
    service.registerOtp({ ...ids, expiresAt: now + 1000 });
    expect(service.checkOtpAttempt({ ...ids, accountId: 'acct-2' }).reason).toBe('otp_attempt_mismatch');
    expect(service.checkOtpAttempt({ ...ids, attemptId: 'attempt-2' }).reason).toBe('otp_attempt_mismatch');
    now += 1000;
    expect(service.checkOtpAttempt(ids).reason).toBe('otp_expired');
  });

  it('blocks replay after a successful outcome', () => {
    const ids = { accountId: 'acct-1', attemptId: 'attempt-1', otpId: 'otp-1' };
    service.registerOtp({ ...ids, expiresAt: now + 5000 });
    service.checkOtpAttempt(ids);
    service.recordOtpOutcome({ accountId: ids.accountId, attemptId: ids.attemptId, outcome: 'success', reasonCode: 'matched' });
    expect(service.checkOtpAttempt(ids).reason).toBe('otp_already_consumed');
  });

  it('handles simultaneous guesses without exceeding the limit', async () => {
    const ids = { accountId: 'acct-1', attemptId: 'attempt-1', otpId: 'otp-1' };
    service.registerOtp({ ...ids, expiresAt: now + 5000 });
    const results = await Promise.all(Array.from({ length: 8 }, () => Promise.resolve().then(() => service.checkOtpAttempt(ids))));
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
  });

  it('fails closed when decision storage fails', () => {
    const failingStore = { consumeWindow() { throw new Error('down'); }, appendAuditEvent() { return true; } };
    const failing = createSecurityModule({ store: failingStore }).securityService;
    try {
      failing.checkVoiceCall({ accountId: 'acct-1', attemptId: 'attempt-1', activeAttempt: true, precedingFactorsPassed: true });
      throw new Error('Expected a storage failure.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'security_store_unavailable', status: 503 });
    }
  });
});
