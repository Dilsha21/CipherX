const { requireIdentifier } = require('./validate');
const { SecurityAdminError } = require('./errors');

const FACTORS = new Set(['password', 'biometric', 'voice_otp', 'session', 'system']);
const OUTCOMES = new Set(['success', 'failure', 'allowed', 'denied', 'error']);
const EVENTS = new Set([
  'authentication', 'rate_limit', 'otp_verification', 'session_issuance', 'security_error',
]);

function createAuditLogger({ store, clock = Date.now, failureMode = 'continue' }) {
  if (!store || typeof store.appendAuditEvent !== 'function') throw new TypeError('An audit store is required.');
  if (!['continue', 'block'].includes(failureMode)) throw new TypeError('failureMode must be continue or block.');

  return function logAuditEvent(input) {
    try {
      const accountId = input.accountId || input.userId;
      requireIdentifier(accountId, 'accountId');
      if (input.attemptId != null) requireIdentifier(input.attemptId, 'attemptId');
      if (input.eventId != null) requireIdentifier(input.eventId, 'eventId');
      if (!FACTORS.has(input.factor)) throw new TypeError('factor is not supported.');
      if (!OUTCOMES.has(input.outcome)) throw new TypeError('outcome is not supported.');

      const eventType = input.eventType || 'authentication';
      if (!EVENTS.has(eventType)) throw new TypeError('eventType is not supported.');
      const timestamp = input.timestamp || new Date(clock()).toISOString();
      if (!Number.isFinite(Date.parse(timestamp))) throw new TypeError('timestamp must be ISO-8601.');

      // Deliberately copy only allow-listed fields. Secrets and request bodies cannot enter the log.
      const event = {
        ...(input.eventId ? { eventId: input.eventId } : {}),
        timestamp,
        accountId,
        ...(input.attemptId ? { attemptId: input.attemptId } : {}),
        eventType,
        factor: input.factor,
        outcome: input.outcome,
        ...(input.reasonCode ? { reasonCode: String(input.reasonCode).slice(0, 64) } : {}),
      };
      const recorded = store.appendAuditEvent(event);
      return { recorded, duplicate: !recorded };
    } catch (cause) {
      const error = new SecurityAdminError('audit_log_failed', 'The security audit event could not be recorded.');
      error.cause = cause;
      if (failureMode === 'block') throw error;
      return { recorded: false, error };
    }
  };
}

module.exports = { createAuditLogger };
