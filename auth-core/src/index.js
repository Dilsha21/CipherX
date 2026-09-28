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

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`auth-core listening on :${PORT}`));
}

module.exports = app;
