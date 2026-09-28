const { randomUUID } = require('crypto');

// In-memory store tracking, per login attempt, which required MFA factors
// have completed. Replace with a real database at integration time; keep
// these function signatures stable since routes depend on them.
const challengesById = new Map();

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function createChallenge({ userId, requiredFactors }) {
  const challengeId = randomUUID();
  const now = Date.now();
  const challenge = {
    challengeId,
    userId,
    requiredFactors,
    completedFactors: [],
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
  };
  challengesById.set(challengeId, challenge);
  return challenge;
}

function getChallenge(challengeId) {
  return challengesById.get(challengeId) || null;
}

function _reset() {
  challengesById.clear();
}

module.exports = { createChallenge, getChallenge, _reset, CHALLENGE_TTL_MS };
