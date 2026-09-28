const { getChallenge } = require('../store/challengeStore');
const { apiError } = require('./errors');

// Looks up a challenge for a route handler, sending the standard
// "invalid or expired" error response itself if it's missing. Returns the
// challenge (truthy) if found, or null (after already responding) if not —
// callers should `return` immediately when this returns null.
function requireChallenge(req, res, challengeId) {
  const challenge = getChallenge(challengeId);
  if (!challenge) {
    apiError(res, 400, 'invalid_challenge', 'Your login attempt has expired or is invalid. Please sign in again.');
    return null;
  }
  return challenge;
}

module.exports = { requireChallenge };
