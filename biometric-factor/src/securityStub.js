/**
 * Security-Admin stub library (imported by Biometric-Factor until integration).
 * Per /shared/API_CONTRACT.md section 4.
 */

function logAuditEvent({ userId, factor = 'biometric', outcome, timestamp = new Date().toISOString(), details = {} }) {
  // In production / integration, this forwards to the Security-Admin service.
  // Stub logs to console / no-op in dev.
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[AUDIT LOG] user=${userId} factor=${factor} outcome=${outcome} time=${timestamp}`, details);
  }
}

function rateLimiter(options = { windowMs: 15 * 60 * 1000, max: 100 }) {
  // Simple rate limiter stub middleware
  return (req, res, next) => {
    next();
  };
}

module.exports = {
  logAuditEvent,
  rateLimiter,
};
