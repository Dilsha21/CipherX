const { randomUUID } = require('crypto');

// In-memory store tracking, per login attempt, which required MFA factors
// have completed. Replace with a real database at integration time; keep
// these function signatures stable since routes depend on them.
const challengesById = new Map();

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function createChallenge({ userId, requiredFactors, ttlMs = CHALLENGE_TTL_MS }) {
  const challengeId = randomUUID();
  const now = Date.now();
  const challenge = {
    challengeId,
    userId,
    requiredFactors,
    completedFactors: [],
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  challengesById.set(challengeId, challenge);
  return challenge;
}

function isExpired(challenge) {
  return Date.now() > challenge.expiresAt;
}

function getChallenge(challengeId) {
  const challenge = challengesById.get(challengeId);
  if (!challenge) return null;
  if (isExpired(challenge)) {
    challengesById.delete(challengeId);
    return null;
  }
  return challenge;
}

// Marks a required factor as completed for a challenge. Idempotent: marking
// an already-completed factor again is a no-op, not a duplicate entry.
function markFactorComplete(challengeId, factor) {
  const challenge = getChallenge(challengeId); // also clears it if expired
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
