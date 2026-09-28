const express = require('express');
const { apiError } = require('../lib/errors');
const { requireChallenge } = require('../lib/challengeLookup');
const { markFactorComplete } = require('../store/challengeStore');
const biometricFactorClient = require('../services/biometricFactorClient');
const voiceOtpFactorClient = require('../services/voiceOtpFactorClient');
const { findUserById } = require('../store/userStore');

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

router.post('/voice-otp/send', async (req, res) => {
  const { challengeId } = req.body || {};
  const challenge = requireChallenge(req, res, challengeId);
  if (!challenge) return;

  const user = findUserById(challenge.userId);
  if (!user) {
    return apiError(res, 400, 'invalid_challenge', 'Your login attempt has expired or is invalid. Please sign in again.');
  }

  const result = await voiceOtpFactorClient.sendCode(challenge.userId, user.phoneNumber);
  return res.status(200).json(result);
});

router.post('/voice-otp/verify', async (req, res) => {
  const { challengeId, otpId, code } = req.body || {};
  const challenge = requireChallenge(req, res, challengeId);
  if (!challenge) return;

  const result = await voiceOtpFactorClient.verifyCode(otpId, code);

  if (!result.passed) {
    return res.status(400).json({ factor: 'voice_otp', passed: false, attemptsRemaining: result.attemptsRemaining });
  }

  const updated = markFactorComplete(challengeId, 'voice_otp');
  return res.status(200).json({ factor: 'voice_otp', passed: true, completedFactors: updated.completedFactors });
});

module.exports = router;
