const express = require('express');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(express.json());

// TODO(Member E): implement per /shared/API_CONTRACT.md section 4
// - export rateLimiter({ windowMs, max }) from src/lib/rateLimiter.js
// - export logAuditEvent({ userId, factor, outcome, timestamp }) from src/lib/auditLog.js
// - GET /internal/audit-log?userId=...&since=...

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'security-admin' }));

const PORT = process.env.PORT || 4003;
if (require.main === module) {
  app.listen(PORT, () => console.log(`security-admin listening on :${PORT}`));
}

module.exports = app;
