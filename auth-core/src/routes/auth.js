const express = require('express');
const { randomUUID } = require('crypto');
const { hashPassword, verifyPassword } = require('../lib/password');
const { apiError } = require('../lib/errors');
const { createUser, findUserByUsername } = require('../store/userStore');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password, phoneNumber } = req.body || {};

  if (!username || !password || !phoneNumber) {
    return apiError(res, 400, 'missing_fields', 'Username, password, and phone number are all required.');
  }

  if (findUserByUsername(username)) {
    return apiError(res, 409, 'username_taken', 'That username is already registered.');
  }

  const passwordHash = await hashPassword(password);
  const user = createUser({ username, passwordHash, phoneNumber });

  return res.status(201).json({ userId: user.userId });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return apiError(res, 400, 'missing_fields', 'Username and password are both required.');
  }

  const user = findUserByUsername(username);
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    return apiError(res, 401, 'invalid_credentials', 'That username or password is not correct.');
  }

  // NOTE: challengeId/requiredFactors tracking is a placeholder here.
  // feature/auth-core-challenge-tracking replaces this with a persistent
  // challenge store so MFA verify steps can look it back up.
  return res.status(200).json({
    challengeId: randomUUID(),
    requiredFactors: ['biometric', 'voice_otp'],
    completedFactors: [],
  });
});

module.exports = router;
