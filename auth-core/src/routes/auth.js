const express = require('express');
const { hashPassword } = require('../lib/password');
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

module.exports = router;
