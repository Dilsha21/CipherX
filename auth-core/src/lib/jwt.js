const jwt = require('jsonwebtoken');
const { jwtSecret, sessionTokenTtlSeconds } = require('../config');

function signSessionToken(userId) {
  const expiresIn = sessionTokenTtlSeconds;
  const token = jwt.sign({ sub: userId }, jwtSecret, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { token, expiresAt };
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

module.exports = { signSessionToken, verifySessionToken };
