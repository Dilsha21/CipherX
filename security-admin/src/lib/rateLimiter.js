const { requirePositiveInteger } = require('./validate');

function rateLimiter({ windowMs, max, keyGenerator, store, clock = Date.now }) {
  requirePositiveInteger(windowMs, 'windowMs');
  requirePositiveInteger(max, 'max');
  if (!store || typeof store.consumeWindow !== 'function') throw new TypeError('A rate-limit store is required.');

  return (req, res, next) => {
    try {
      const key = keyGenerator ? keyGenerator(req) : req.ip;
      if (!key) return res.status(400).json({ error: 'invalid_identifier', message: 'A stable rate-limit identifier is required.' });
      const decision = store.consumeWindow(String(key), { now: clock(), windowMs, max });
      const retryAfter = Math.max(0, Math.ceil((decision.resetAt - clock()) / 1000));
      res.set('RateLimit-Remaining', String(decision.remaining));
      res.set('RateLimit-Reset', String(retryAfter));
      if (!decision.allowed) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please wait and try again.', retryAfter });
      }
      return next();
    } catch (_error) {
      return res.status(503).json({ error: 'security_store_unavailable', message: 'The security check is temporarily unavailable.' });
    }
  };
}

module.exports = { rateLimiter };
