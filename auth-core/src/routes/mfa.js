const express = require('express');
const { apiError } = require('../lib/errors');
const { requireChallenge } = require('../lib/challengeLookup');
const { markFactorComplete } = require('../store/challengeStore');
const biometricFactorClient = require('../services/biometricFactorClient');

const router = express.Router();

router.post('/biometric/challenge', async (req, res) => {
  const { challengeId } = req.body || {};
  const challenge = requireChallenge(req, res, challengeId);
  if (!challenge) return;

  const options = await biometricFactorClient.requestLoginOptions(challenge.userId);
  return res.status(200).json(options);
});

router.post('/biometric/verify', async (req, res) => {
  const { challengeId, assertionResponse } = req.body || {};
  const challenge = requireChallenge(req, res, challengeId);
  if (!challenge) return;

  const { passed } = await biometricFactorClient.verifyLoginAssertion(challenge.userId, assertionResponse);

  if (!passed) {
    return apiError(res, 401, 'factor_failed', 'That biometric check did not succeed. Please try again.');
  }

  const updated = markFactorComplete(challengeId, 'biometric');
  return res.status(200).json({ factor: 'biometric', passed: true, completedFactors: updated.completedFactors });
});

module.exports = router;
