# Auth Core (Orchestrator) — Member A

**Branch:** `feature/auth-core`
**Based on:** Doc1 — System Architecture and Requirements
**Port:** `4000`

## What you're building

The main backend service. It is the **only** service the frontend ever talks
to. It:

1. Handles registration and password login (`bcrypt` hashing).
2. Tracks, per login attempt (`challengeId`), which required factors
   (`biometric`, `voice_otp`) have completed.
3. Proxies MFA requests server-to-server to Biometric-Factor (port 4001) and
   Voice-OTP-Factor (port 4002) — never trusts the client's word that a
   factor passed.
4. Issues a signed session token (JWT) only once every required factor has
   independently succeeded.
5. Calls `logAuditEvent(...)` (Security-Admin's library, stubbed locally for
   now) on every login attempt, success or failure — this is FR6 from Doc1.

Full endpoint shapes: [`/shared/API_CONTRACT.md`](../shared/API_CONTRACT.md)
sections 1 and 4 (library interface).

## While developing standalone

Biometric-Factor and Voice-OTP-Factor aren't your dependency to build.
`src/services/biometricFactorClient.js` and `src/services/voiceOtpFactorClient.js`
make real HTTP calls to `BIOMETRIC_FACTOR_URL` / `VOICE_OTP_FACTOR_URL`
(default `:4001` / `:4002`), but the test suite never needs either service
running — routes are tested with `nock` mocking the HTTP layer (see
`tests/routes/mfa.*.test.js`).

## External tools / libraries

- `express` — HTTP server
- `bcrypt` — password hashing
- `jsonwebtoken` — session tokens
- `uuid` — challenge/user IDs
- No third-party *external service* (no API keys needed) — this module is
  self-contained.

## Requirements this module is responsible for

FR1, FR6 (partially — logging call only, storage is Security-Admin's),
NFR2 (AAL2: only issues a session once two distinct factor categories have
independently passed), NFR3 (TLS — see `security-admin` for the actual
enforcement middleware you'll wire in at integration; for now just don't log
secrets in plaintext).

## Implementation status

- [x] `POST /auth/register` — bcrypt password hashing, in-memory user store
- [x] `POST /auth/login` — password check, issues a persisted challenge
- [x] Persistent challenge + completed-factors tracking (10-minute TTL)
- [x] Server-to-server MFA proxy to Biometric-Factor / Voice-OTP-Factor
      (`POST /auth/mfa/biometric/challenge|verify`,
      `POST /auth/mfa/voice-otp/send|verify`). Configurable via
      `BIOMETRIC_FACTOR_URL` / `VOICE_OTP_FACTOR_URL` — see `.env.example`.
      An unreachable factor service returns `502 service_unavailable`
      rather than hanging the request.
- [x] `POST /auth/session/finalize` — issues a JWT session token once every
      required factor has independently passed; `409 factors_incomplete`
      otherwise. The challenge is invalidated on success so it can't be
      replayed for a second token. Configure `JWT_SECRET` in production —
      see `.env.example`.
- [x] Audit log wiring — `src/lib/auditLog.js` is a local stand-in for
      Security-Admin's `logAuditEvent(...)` (same function signature per
      `/shared/API_CONTRACT.md` section 4), called on every password login,
      biometric verify, voice-otp verify, and session finalize, success or
      failure (FR6). Swap the import for Security-Admin's real
      implementation at integration time.

All five pieces of this module are implemented; see `git log` on this
branch for the incremental history (each feature was built on its own
sub-branch and merged in).

## Database

The user/challenge stores above are in-memory placeholders. Real
persistence is a shared Neon Postgres — see
[`/shared/DATABASE.md`](../shared/DATABASE.md). `migrations/` has an
initial migration for `auth_core.users` and `auth_core.challenges`
matching the current in-memory shape; the app code isn't wired to actually
query it yet (that's a follow-up once `DATABASE_URL` is available to
everyone). You can still run it now to sanity-check your Neon credentials:

```
cp .env.example .env        # fill in DIRECT_DATABASE_URL
npm run migrate:up
```

## Getting started

```
cd auth-core
npm install
npm test      # runs the full test suite
npm start     # starts the server on :4000
```
