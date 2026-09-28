const { logAuditEvent, getAuditEvents, _reset } = require('../../src/lib/auditLog');

describe('auditLog stub', () => {
  beforeEach(() => _reset());

  it('records an event with the given fields', () => {
    logAuditEvent({ userId: 'user-1', factor: 'password', outcome: 'success', timestamp: '2026-01-01T00:00:00.000Z' });
    const events = getAuditEvents();
    expect(events).toEqual([
      { userId: 'user-1', factor: 'password', outcome: 'success', timestamp: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('defaults timestamp to now when omitted', () => {
    logAuditEvent({ userId: 'user-1', factor: 'password', outcome: 'failure' });
    const [event] = getAuditEvents();
    expect(event.timestamp).toBeDefined();
    expect(new Date(event.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('accumulates multiple events in order', () => {
    logAuditEvent({ userId: 'user-1', factor: 'password', outcome: 'success' });
    logAuditEvent({ userId: 'user-1', factor: 'biometric', outcome: 'success' });
    expect(getAuditEvents().map((e) => e.factor)).toEqual(['password', 'biometric']);
  });
});
