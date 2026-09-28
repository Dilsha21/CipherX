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

// Marks a required factor as completed for a challenge. Idempotent: marking
// an already-completed factor again is a no-op, not a duplicate entry.
function markFactorComplete(challengeId, factor) {
  const challenge = challengesById.get(challengeId);
  if (!challenge) return null;

  if (!challenge.completedFactors.includes(factor)) {
    challenge.completedFactors.push(factor);
  }
  return challenge;
}

function _reset() {
  challengesById.clear();
}

module.exports = { createChallenge, getChallenge, markFactorComplete, _reset, CHALLENGE_TTL_MS };
