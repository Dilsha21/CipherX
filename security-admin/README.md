# Security-Admin — Member E

Security controls and threat-model documentation for the accessible MFA system. This module stays within `feature/security-admin` and implements the interface in `shared/API_CONTRACT.md` without calling other services directly.

## What you're building

Two things:

### 1. A reusable library + small internal service
- `rateLimiter({ windowMs, max })` — Express middleware, used to cap
  call-triggering and login attempts across the system (this is what
  Voice-OTP-Factor needs for anti call-bombing, and Auth Core needs for
  login brute-force protection).
- `logAuditEvent({ userId, factor, outcome, timestamp })` — appends to an
  audit log (FR6: every login attempt, success/failure, factor, timestamp).
- `GET /internal/audit-log?userId=...&since=...` — internal endpoint to
  query the log (for an admin view / manual review).
- TLS enforcement: middleware/config notes for the other three backend
  services (helmet + reject non-HTTPS in production) — NFR3.

Other modules import your library at **integration time only**. Until then
they call a local no-op stub with the same function signature, so you don't
block anyone and they don't block you. See
[`/shared/API_CONTRACT.md`](../shared/API_CONTRACT.md) section 4.

### 2. `THREAT_MODEL.md` — the actual deliverable for Doc5
Write up the STRIDE analysis properly in this folder (not just in the Word
doc) so it lives next to the code it's evaluating. It must cover, at
minimum, the six STRIDE categories against the three trust zones (phone /
backend / third-party voice provider) exactly as scoped in Doc5:

| Threat | Mitigation owner |
|---|---|
| Spoofing | Biometric-Factor (device-bound key) |
| Tampering | TLS 1.3 everywhere + signed challenge-response |
| Repudiation | Your audit log (FR6) |
| Information Disclosure | No raw biometric data ever stored (Biometric-Factor); OTPs stored only as short-lived hashes (Voice-OTP-Factor) |
| **Denial of Service (highest severity)** | Your `rateLimiter` on the call-trigger endpoint — flag *why* this is ranked highest: the target users may find repeated harassing calls harder to screen than a sighted user glancing at caller ID |
| Elevation of Privilege | Auth Core (session only issued once all required factors independently pass) |
| SIM-swap / call-forwarding | Explicitly accepted residual risk (Doc5 E4) — document it, don't pretend to solve it |

## External tools / libraries

- `express-rate-limit` — the actual rate-limiting implementation.
- `helmet` — standard Express security headers / HTTPS enforcement.
- No external account/API key needed.

## Requirements this module is responsible for

FR6, NFR3, and the full STRIDE threat model / trust-boundary write-up.

## Database

The audit log needs real persistence eventually — see
[`/shared/DATABASE.md`](../shared/DATABASE.md). You get your own Postgres
schema (`security_admin`) on the shared Neon project. `migrations/` is set
up with `node-pg-migrate` but empty — add your first migration (e.g. an
`audit_log` table: `user_id`, `factor`, `outcome`, `timestamp`) when you
get to persistence, matching the `logAuditEvent(...)` shape other services
already call against a local stub:

```
cp .env.example .env        # fill in DIRECT_DATABASE_URL
npm run migrate:create add-audit-log-table
npm run migrate:up
```

## Getting started

```js
const { logAuditEvent, rateLimiter, securityService, createSecurityModule } = require('./src');
```

The original contract remains supported:

- `logAuditEvent({ userId, factor, outcome, timestamp })`
- `rateLimiter({ windowMs, max, keyGenerator, store, clock })` returns Express middleware. Integration should normally use `createSecurityModule().rateLimiter(...)`, which injects the module store.
- `GET /internal/audit-log?userId=...&since=...` (the clearer alias `accountId` is also accepted).

The independent adapter adds:

- `securityService.checkVoiceCall({ accountId, attemptId, sourceId?, activeAttempt, precedingFactorsPassed })`
- `securityService.registerOtp({ accountId, attemptId, otpId, expiresAt })`
- `securityService.checkOtpAttempt({ accountId, attemptId, otpId })`
- `securityService.recordOtpOutcome({ accountId, attemptId, outcome, reasonCode })`

All decision methods return data; they never place calls or compare OTP values. A denied or errored call decision must stop Voice-OTP before the Twilio API is invoked. `sourceId` must be a trustworthy server-derived identifier, never arbitrary client input. Phone numbers are not rate-limit keys.

## Defaults

- Voice calls: 3 per account per 10-minute fixed window.
- Optional trusted source: 10 calls per 10-minute fixed window.
- OTP verification: 3 guesses per issued OTP.
- Audit write failure: operation may continue, but `logAuditEvent` returns `{ recorded: false, error }`; rate-limit and OTP-store failures fail closed.

Override these through `createSecurityModule({ callWindowMs, maxCalls, maxSourceCalls, maxOtpAttempts, clock, store })`. The injected clock makes tests deterministic.

## Storage limitations

The default store is in memory. It loses counters and audit events on restart, is not shared by multiple server instances, and is not tamper-proof. It is suitable only for this isolated prototype. Production integration must replace it with an atomic shared store and durable append-only audit destination while preserving the methods used by `SecurityService`.

## Integration requirements

1. Auth Core supplies the stable account ID and active login-attempt/challenge ID. It must attest that the password and required preceding factor have passed; the browser must not set these flags.
2. Voice-OTP calls `checkVoiceCall` before generating/sending every code and calls `registerOtp` only after a new `otpId` is issued. It calls `checkOtpAttempt` before comparing a code and `recordOtpOutcome` afterward.
3. Auth Core and factor services send audit events for password, biometric, OTP, rate-limit, and session outcomes. They must never pass secrets or complete request bodies.
4. Production deployment terminates TLS 1.3, authenticates internal services, restricts the audit endpoint to administrators, and replaces the process-local store.

These are additive integration details. If the shared contract is extended, add the four adapter signatures above without redefining existing endpoints.

## Database setup

The project provides a shared Neon Postgres database. Security-Admin owns
the `security_admin` schema. See
[shared/DATABASE.md](../shared/DATABASE.md).

Migration tooling is configured, but audit logging and security counters
currently use in-memory storage. Postgres persistence is a follow-up.

To prepare a migration:

```sh
cp .env.example .env
# Configure DIRECT_DATABASE_URL in .env.
npm run migrate:create add-audit-log-table
# Implement and review the generated migration before applying it.
npm run migrate:up
```

Keep credentials in `.env`; never commit them.

## Run

```sh
npm install
npm test
npm start
```

The service listens on port `4003` by default.
