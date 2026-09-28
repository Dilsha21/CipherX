const { randomUUID } = require('crypto');

// In-memory user store for development. Replace with a real database at
// integration time; the function signatures below are what the rest of
// auth-core depends on, so keep them stable.
const usersByUsername = new Map();

function createUser({ username, passwordHash, phoneNumber }) {
  const userId = randomUUID();
  const user = { userId, username, passwordHash, phoneNumber };
  usersByUsername.set(username, user);
  return user;
}

function findUserByUsername(username) {
  return usersByUsername.get(username) || null;
}

function _reset() {
  usersByUsername.clear();
}

module.exports = { createUser, findUserByUsername, _reset };
