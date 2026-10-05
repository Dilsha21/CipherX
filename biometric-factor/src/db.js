const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

let pool = null;
if (dbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'test' ? false : { rejectUnauthorized: false },
  });
}

// In-memory fallback repositories (used in dev/test when DB URL is not provided)
const inMemoryChallenges = new Map(); // key: `${userId}:${type}`
const inMemoryCredentials = new Map(); // key: userId -> Array of credentials
const inMemoryAttempts = new Map(); // key: userId -> failedAttempts count

const db = {
  // Challenge Management
  async saveChallenge(userId, challenge, type = 'register', ttlMs = 5 * 60 * 1000) {
    const expiresAt = new Date(Date.now() + ttlMs);
    if (pool) {
      await pool.query(
        `INSERT INTO biometric_factor.challenges (user_id, challenge, type, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, type)
         DO UPDATE SET challenge = EXCLUDED.challenge, expires_at = EXCLUDED.expires_at`,
        [userId, challenge, type, expiresAt]
      );
    } else {
      inMemoryChallenges.set(`${userId}:${type}`, { challenge, type, expiresAt });
    }
  },

  async getChallenge(userId, type = 'register') {
    if (pool) {
      const res = await pool.query(
        `SELECT challenge, expires_at FROM biometric_factor.challenges WHERE user_id = $1 AND type = $2`,
        [userId, type]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      if (new Date(row.expires_at) < new Date()) {
        await this.deleteChallenge(userId, type);
        return null;
      }
      return row.challenge;
    } else {
      const record = inMemoryChallenges.get(`${userId}:${type}`);
      if (!record) return null;
      if (record.expiresAt < new Date()) {
        inMemoryChallenges.delete(`${userId}:${type}`);
        return null;
      }
      return record.challenge;
    }
  },

  async deleteChallenge(userId, type = 'register') {
    if (pool) {
      await pool.query(
        `DELETE FROM biometric_factor.challenges WHERE user_id = $1 AND type = $2`,
        [userId, type]
      );
    } else {
      inMemoryChallenges.delete(`${userId}:${type}`);
    }
  },

  // Credential Management
  async saveCredential(userId, credential) {
    // credential: { id, publicKey (Buffer), counter, transports }
    const pubKeyBase64 = Buffer.isBuffer(credential.publicKey)
      ? credential.publicKey.toString('base64')
      : (typeof credential.publicKey === 'string' ? credential.publicKey : Buffer.from(credential.publicKey).toString('base64'));

    if (pool) {
      await pool.query(
        `INSERT INTO biometric_factor.credentials (id, user_id, public_key, counter, transports, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET public_key = EXCLUDED.public_key, counter = EXCLUDED.counter, transports = EXCLUDED.transports`,
        [
          credential.id,
          userId,
          pubKeyBase64,
          credential.counter || 0,
          JSON.stringify(credential.transports || []),
        ]
      );
    } else {
      const userCreds = inMemoryCredentials.get(userId) || [];
      const existingIdx = userCreds.findIndex((c) => c.id === credential.id);
      const credRecord = {
        id: credential.id,
        userId,
        publicKey: Buffer.isBuffer(credential.publicKey)
          ? credential.publicKey
          : Buffer.from(pubKeyBase64, 'base64'),
        counter: credential.counter || 0,
        transports: credential.transports || [],
        createdAt: new Date(),
      };
      if (existingIdx >= 0) {
        userCreds[existingIdx] = credRecord;
      } else {
        userCreds.push(credRecord);
      }
      inMemoryCredentials.set(userId, userCreds);
    }
  },

  async getCredentialsByUserId(userId) {
    if (pool) {
      const res = await pool.query(
        `SELECT id, public_key, counter, transports FROM biometric_factor.credentials WHERE user_id = $1`,
        [userId]
      );
      return res.rows.map((row) => ({
        id: row.id,
        publicKey: Buffer.from(row.public_key, 'base64'),
        counter: parseInt(row.counter, 10),
        transports: typeof row.transports === 'string' ? JSON.parse(row.transports) : (row.transports || []),
      }));
    } else {
      const userCreds = inMemoryCredentials.get(userId) || [];
      return userCreds.map((c) => ({
        id: c.id,
        publicKey: c.publicKey,
        counter: c.counter,
        transports: c.transports,
      }));
    }
  },

  async getCredentialById(credentialId) {
    if (pool) {
      const res = await pool.query(
        `SELECT id, user_id, public_key, counter, transports FROM biometric_factor.credentials WHERE id = $1`,
        [credentialId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        publicKey: Buffer.from(row.public_key, 'base64'),
        counter: parseInt(row.counter, 10),
        transports: typeof row.transports === 'string' ? JSON.parse(row.transports) : (row.transports || []),
      };
    } else {
      for (const [userId, creds] of inMemoryCredentials.entries()) {
        const found = creds.find((c) => c.id === credentialId);
        if (found) return found;
      }
      return null;
    }
  },

  async updateCredentialCounter(credentialId, counter) {
    if (pool) {
      await pool.query(
        `UPDATE biometric_factor.credentials SET counter = $1 WHERE id = $2`,
        [counter, credentialId]
      );
    } else {
      for (const [userId, creds] of inMemoryCredentials.entries()) {
        const found = creds.find((c) => c.id === credentialId);
        if (found) {
          found.counter = counter;
          break;
        }
      }
    }
  },

  // Failed Attempts Tracking (FR5: 3-strikes rule)
  async getFailedAttempts(userId) {
    if (pool) {
      const res = await pool.query(
        `SELECT failed_attempts FROM biometric_factor.attempts WHERE user_id = $1`,
        [userId]
      );
      if (res.rows.length === 0) return 0;
      return res.rows[0].failed_attempts;
    } else {
      return inMemoryAttempts.get(userId) || 0;
    }
  },

  async incrementFailedAttempts(userId) {
    if (pool) {
      const res = await pool.query(
        `INSERT INTO biometric_factor.attempts (user_id, failed_attempts, updated_at)
         VALUES ($1, 1, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET failed_attempts = biometric_factor.attempts.failed_attempts + 1, updated_at = NOW()
         RETURNING failed_attempts`,
        [userId]
      );
      return res.rows[0].failed_attempts;
    } else {
      const current = inMemoryAttempts.get(userId) || 0;
      const next = current + 1;
      inMemoryAttempts.set(userId, next);
      return next;
    }
  },

  async resetFailedAttempts(userId) {
    if (pool) {
      await pool.query(
        `UPDATE biometric_factor.attempts SET failed_attempts = 0, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
    } else {
      inMemoryAttempts.set(userId, 0);
    }
  },

  // Reset in-memory stores (used in test suite reset)
  clearInMemoryStore() {
    inMemoryChallenges.clear();
    inMemoryCredentials.clear();
    inMemoryAttempts.clear();
  },
};

module.exports = db;
