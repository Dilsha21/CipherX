// Dev-only stand-in for Auth Core's public API, using the exact JSON shapes
// from /shared/API_CONTRACT.md section 1. Enabled by `npm run dev:mock`.
//
//   username: demo    password: demo-password
//
// The "phone call" is printed to the terminal running the dev server.
// For the biometric step, open /__mock/enrol once to create a passkey on a
// real or DevTools virtual authenticator (the real enrolment flow is not
// part of Auth Core's public contract yet).

import { randomBytes, randomInt, randomUUID } from 'node:crypto';

const USER = { username: 'demo', password: 'demo-password' };
const MAX_OTP_ATTEMPTS = 3;
const OTP_TTL_MS = 5 * 60 * 1000;

const ENROL_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>Mock enrolment</title></head>
<body>
<main>
  <h1>Mock biometric enrolment</h1>
  <p>Development only. Creates a passkey for the demo user on this device so the sign-in flow has something to verify.</p>
  <button id="enrol" type="button">Create passkey</button>
  <p id="result" role="status"></p>
  <p><a href="/">Back to sign in</a></p>
</main>
<script>
document.getElementById('enrol').addEventListener('click', async () => {
  const result = document.getElementById('result');
  try {
    await navigator.credentials.create({ publicKey: {
      rp: { name: 'CipherX (mock)' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'demo', displayName: 'Demo user' },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    } });
    result.textContent = 'Passkey created. You can now sign in.';
  } catch (err) {
    result.textContent = 'Could not create a passkey: ' + err.message;
  }
});
</script>
</body>
</html>`;

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (_err) {
        resolve({});
      }
    });
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function authCoreMock() {
  const challenges = new Map();
  const otps = new Map();

  const invalidChallenge = (res) =>
    send(res, 400, {
      error: 'invalid_challenge',
      message: 'Your login attempt has expired or is invalid. Please sign in again.',
    });

  const routes = {
    '/auth/login': (body, res) => {
      if (body.username !== USER.username || body.password !== USER.password) {
        return send(res, 401, { error: 'invalid_credentials', message: 'That username or password is not correct.' });
      }
      const challenge = {
        challengeId: randomUUID(),
        requiredFactors: ['biometric', 'voice_otp'],
        completedFactors: [],
        webauthnChallenge: null,
      };
      challenges.set(challenge.challengeId, challenge);
      return send(res, 200, {
        challengeId: challenge.challengeId,
        requiredFactors: challenge.requiredFactors,
        completedFactors: challenge.completedFactors,
      });
    },

    '/auth/mfa/biometric/challenge': (body, res, challenge) => {
      challenge.webauthnChallenge = randomBytes(32).toString('base64url');
      return send(res, 200, {
        challenge: challenge.webauthnChallenge,
        timeout: 120000,
        userVerification: 'preferred',
        allowCredentials: [],
      });
    },

    // Checks only that the assertion answers the challenge we issued. There
    // is no stored public key here, so no signature verification.
    '/auth/mfa/biometric/verify': (body, res, challenge) => {
      let answered = null;
      try {
        const clientData = Buffer.from(body.assertionResponse.response.clientDataJSON, 'base64url');
        answered = JSON.parse(clientData.toString('utf8')).challenge;
      } catch (_err) {
        answered = null;
      }
      if (!challenge.webauthnChallenge || answered !== challenge.webauthnChallenge) {
        return send(res, 401, {
          error: 'factor_failed',
          message: 'That biometric check did not succeed. Please try again.',
        });
      }
      challenge.webauthnChallenge = null;
      if (!challenge.completedFactors.includes('biometric')) challenge.completedFactors.push('biometric');
      return send(res, 200, { factor: 'biometric', passed: true, completedFactors: challenge.completedFactors });
    },

    '/auth/mfa/voice-otp/send': (body, res) => {
      const otpId = randomUUID();
      const code = String(randomInt(0, 1000000)).padStart(6, '0');
      const expiresAt = Date.now() + OTP_TTL_MS;
      otps.set(otpId, { code, expiresAt, attemptsRemaining: MAX_OTP_ATTEMPTS });
      console.log(`\n[mock auth-core] Phone call: "Your login code is ${code.split('').join(' ')}."\n`);
      return send(res, 200, {
        otpId,
        expiresAt: new Date(expiresAt).toISOString(),
        attemptsRemaining: MAX_OTP_ATTEMPTS,
      });
    },

    '/auth/mfa/voice-otp/verify': (body, res, challenge) => {
      const otp = otps.get(body.otpId);
      if (!otp || Date.now() > otp.expiresAt || otp.attemptsRemaining <= 0) {
        return send(res, 400, { factor: 'voice_otp', passed: false, attemptsRemaining: 0 });
      }
      if (body.code !== otp.code) {
        otp.attemptsRemaining -= 1;
        return send(res, 400, { factor: 'voice_otp', passed: false, attemptsRemaining: otp.attemptsRemaining });
      }
      otps.delete(body.otpId);
      if (!challenge.completedFactors.includes('voice_otp')) challenge.completedFactors.push('voice_otp');
      return send(res, 200, { factor: 'voice_otp', passed: true, completedFactors: challenge.completedFactors });
    },

    '/auth/session/finalize': (body, res, challenge) => {
      const missing = challenge.requiredFactors.filter((f) => !challenge.completedFactors.includes(f));
      if (missing.length > 0) {
        return send(res, 409, {
          error: 'factors_incomplete',
          message: `Not all required factors have passed yet: ${missing.join(', ')}.`,
          missing,
        });
      }
      challenges.delete(challenge.challengeId);
      return send(res, 200, {
        sessionToken: 'mock.session.token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    },
  };

  return {
    name: 'auth-core-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0];

        if (req.method === 'GET' && path === '/__mock/enrol') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.end(ENROL_PAGE);
        }

        const handler = routes[path];
        if (req.method !== 'POST' || !handler) return next();

        const body = await readJson(req);
        if (path === '/auth/login') return handler(body, res);

        const challenge = challenges.get(body.challengeId);
        if (!challenge) return invalidChallenge(res);
        return handler(body, res, challenge);
      });
    },
  };
}
