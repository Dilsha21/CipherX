// Local stand-in for Security-Admin's audit log library
// (see /shared/API_CONTRACT.md section 4: logAuditEvent(...)).
// Keeps the same signature so swapping in the real implementation at
// integration time is a one-line import change, not a rewrite of callers.

const events = [];

function logAuditEvent({ userId, factor, outcome, timestamp = new Date().toISOString() }) {
  events.push({ userId, factor, outcome, timestamp });
}

function getAuditEvents() {
  return events.slice();
}

function _reset() {
  events.length = 0;
}

module.exports = { logAuditEvent, getAuditEvents, _reset };
