const { createSecurityModule } = require('../src');

describe('audit logging', () => {
  it('records only allow-listed fields and drops secrets', () => {
    const module = createSecurityModule();
    const result = module.logAuditEvent({
      eventId: 'event-1', accountId: 'acct-1', attemptId: 'attempt-1',
      eventType: 'authentication', factor: 'password', outcome: 'failure', reasonCode: 'invalid_credentials',
      password: 'secret', otp: '123456', authorization: 'Bearer secret', body: { privateKey: 'secret' },
    });
    expect(result.recorded).toBe(true);
    const [event] = module.store.queryAuditEvents();
    expect(event).toMatchObject({ accountId: 'acct-1', factor: 'password', outcome: 'failure' });
    expect(JSON.stringify(event)).not.toMatch(/secret|123456|authorization|privateKey/i);
  });

  it('deduplicates events with the same eventId', () => {
    const module = createSecurityModule();
    const event = { eventId: 'event-1', accountId: 'acct-1', eventType: 'session_issuance', factor: 'session', outcome: 'success' };
    expect(module.logAuditEvent(event)).toMatchObject({ recorded: true, duplicate: false });
    expect(module.logAuditEvent(event)).toMatchObject({ recorded: false, duplicate: true });
    expect(module.store.queryAuditEvents()).toHaveLength(1);
  });

  it('handles malformed events explicitly', () => {
    const module = createSecurityModule();
    const result = module.logAuditEvent({ accountId: '', factor: 'password', outcome: 'success' });
    expect(result.recorded).toBe(false);
    expect(result.error.code).toBe('audit_log_failed');
  });

  it('supports blocking and continuing audit failure modes', () => {
    const store = { appendAuditEvent() { throw new Error('disk unavailable'); } };
    const continuing = createSecurityModule({ store, auditFailureMode: 'continue' });
    expect(continuing.logAuditEvent({ accountId: 'acct-1', factor: 'password', outcome: 'success' }).recorded).toBe(false);
    const blocking = createSecurityModule({ store, auditFailureMode: 'block' });
    try {
      blocking.logAuditEvent({ accountId: 'acct-1', factor: 'password', outcome: 'success' });
      throw new Error('Expected an audit failure.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'audit_log_failed' });
    }
  });
});
