const express = require('express');
const { requireChallenge } = require('../lib/challengeLookup');
const { invalidateChallenge } = require('../store/challengeStore');
const { signSessionToken } = require('../lib/jwt');
const { logAuditEvent } = require('../lib/auditLog');

const router = express.Router();

router.post('/finalize', async (req, res) => {
  const { challengeId } = req.body || {};
  const challenge = requireChallenge(req, res, challengeId);
  if (!challenge) return;

  const missing = challenge.requiredFactors.filter((f) => !challenge.completedFactors.includes(f));

  if (missing.length > 0) {
    logAuditEvent({ userId: challenge.userId, factor: 'session', outcome: 'failure' });
    return res.status(409).json({
      error: 'factors_incomplete',
      message: `Not all required factors have passed yet: ${missing.join(', ')}.`,
      missing,
    });
  }

  const { token, expiresAt } = signSessionToken(challenge.userId);
  invalidateChallenge(challengeId); // one-time use: can't be replayed for a second session

  logAuditEvent({ userId: challenge.userId, factor: 'session', outcome: 'success' });

  return res.status(200).json({ sessionToken: token, expiresAt });
});

module.exports = router;
