const express = require('express');
const authRoutes = require('./routes/auth');
const mfaRoutes = require('./routes/mfa');

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/auth/mfa', mfaRoutes);

// TODO(Member A): implement per /shared/API_CONTRACT.md section 1
// - POST /auth/session/finalize

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-core' }));

// Catches errors forwarded by asyncHandler, e.g. a factor service being
// unreachable. Kept last so it only sees errors routes didn't handle
// themselves.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('auth-core unhandled route error:', err.message);
  res.status(502).json({
    error: 'service_unavailable',
    message: 'A required service is temporarily unavailable. Please try again shortly.',
  });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`auth-core listening on :${PORT}`));
}

module.exports = app;
