const express = require('express');
const { hashPassword, verifyPassword } = require('../lib/password');
const { apiError } = require('../lib/errors');
const { createUser, findUserByUsername } = require('../store/userStore');
const { createChallenge } = require('../store/challengeStore');
const { normalizeField } = require('../lib/validate');
const { REQUIRED_FACTORS } = require('../lib/constants');

const router = express.Router();

router.post('/register', async (req, res) => {
  const username = normalizeField(req.body && req.body.username);
  const password = normalizeField(req.body && req.body.password);
  const phoneNumber = normalizeField(req.body && req.body.phoneNumber);

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
  const username = normalizeField(req.body && req.body.username);
  const password = normalizeField(req.body && req.body.password);

  if (!username || !password) {
    return apiError(res, 400, 'missing_fields', 'Username and password are both required.');
  }

  const user = findUserByUsername(username);
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    return apiError(res, 401, 'invalid_credentials', 'That username or password is not correct.');
  }

  const challenge = createChallenge({ userId: user.userId, requiredFactors: REQUIRED_FACTORS });

  return res.status(200).json({
    challengeId: challenge.challengeId,
    requiredFactors: challenge.requiredFactors,
    completedFactors: challenge.completedFactors,
  });
});

module.exports = router;
