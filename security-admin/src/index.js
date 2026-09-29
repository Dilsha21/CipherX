const express = require('express');
const helmet = require('helmet');
const { InMemorySecurityStore } = require('./store/inMemorySecurityStore');
const { createAuditLogger } = require('./lib/auditLog');
const { rateLimiter } = require('./lib/rateLimiter');
const { SecurityService } = require('./securityService');

const app = express();
app.use(helmet());
app.use(express.json());

const store = new InMemorySecurityStore();
const logAuditEvent = createAuditLogger({ store, failureMode: 'continue' });
const securityService = new SecurityService({ store, audit: logAuditEvent });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'security-admin' }));

app.get('/internal/audit-log', (req, res) => {
  const accountId = req.query.accountId || req.query.userId;
  const since = req.query.since == null ? undefined : Date.parse(req.query.since);
  if (req.query.since != null && !Number.isFinite(since)) {
    return res.status(400).json({ error: 'invalid_since', message: 'The since value must be a valid ISO-8601 timestamp.' });
  }
  try {
    return res.json(store.queryAuditEvents({ accountId, since }));
  } catch (_error) {
    return res.status(503).json({ error: 'audit_store_unavailable', message: 'The audit log is temporarily unavailable.' });
  }
});

const PORT = process.env.PORT || 4003;
if (require.main === module) {
  app.listen(PORT, () => console.log(`security-admin listening on :${PORT}`));
}

module.exports = app;
module.exports.rateLimiter = (options) => rateLimiter({ ...options, store: options.store || store });
module.exports.logAuditEvent = logAuditEvent;
module.exports.securityService = securityService;
module.exports.createSecurityModule = (options = {}) => {
  const moduleStore = options.store || new InMemorySecurityStore();
  const audit = options.audit || createAuditLogger({ store: moduleStore, clock: options.clock, failureMode: options.auditFailureMode || 'continue' });
  return {
    store: moduleStore,
    logAuditEvent: audit,
    rateLimiter: (limiterOptions) => rateLimiter({ ...limiterOptions, store: moduleStore, clock: options.clock }),
    securityService: new SecurityService({ ...options, store: moduleStore, audit }),
  };
};
