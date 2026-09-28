# API Contract — MFA for Visually Impaired Users

This is the single source of truth for how the five modules talk to each other.
**Everyone builds against this file, not against each other's code.** During
development, every module mocks the *other* modules using the shapes defined
here. Real wiring only happens once, during integration.

Rule: this file only grows. If you need to change an endpoint another member
already relies on, open a PR that @-mentions them — don't just redefine it.

## Architecture

```
                 (browser/mobile, screen-reader driven)
                            Frontend
                               |
                               |  HTTPS/JSON (the ONLY thing frontend calls)
                               v
                        Auth Core (Orchestrator)
                     /            |            \
                    v             v              v
          Biometric Factor   Voice-OTP Factor   Security-Admin
          (WebAuthn/FIDO2)   (Twilio Voice)   (rate-limit, audit log,
                                                 imported as a lib by
                                                 the 3 backend services)
```

- **Frontend never calls Biometric-Factor or Voice-OTP-Factor directly.**
  It only calls Auth Core. Auth Core proxies to the factor services
  server-to-server and is the only service that issues a session token.
  This means the Frontend dev only needs to mock Auth Core's contract below,
  not three separate services.
- Biometric-Factor and Voice-OTP-Factor are plain internal HTTP services.
  Their owners can develop and test them completely standalone with
  curl/Postman/Jest — no dependency on Auth Core or Frontend being built yet.
- Security-Admin ships as a small internal HTTP service too (for the audit
  log/admin view) **and** a tiny middleware library
  (`rateLimiter`, `logAuditEvent`) that Auth Core, Biometric-Factor and
  Voice-OTP-Factor import at integration time. Until integration, those three
  just call a no-op stub — see each README.

All services run on localhost on different ports during dev:

| Service | Port | Folder |
|---|---|---|
| Auth Core | 4000 | `/auth-core` |
| Biometric Factor | 4001 | `/biometric-factor` |
| Voice-OTP Factor | 4002 | `/voice-otp-factor` |
| Security-Admin | 4003 | `/security-admin` |
| Frontend (dev server) | 5173 | `/frontend` |

---

## 1. Auth Core — public API (called by Frontend)

### `POST /auth/register`
```json
// request
{ "username": "string", "password": "string", "phoneNumber": "+94xxxxxxxxx" }
// response 201
{ "userId": "uuid" }
```

### `POST /auth/login`
Step 1: password check only.
```json
// request
{ "username": "string", "password": "string" }
// response 200
{
  "challengeId": "uuid",
  "requiredFactors": ["biometric", "voice_otp"],
  "completedFactors": []
}
// response 401
{ "error": "invalid_credentials" }
```

### `POST /auth/mfa/biometric/challenge`
Auth Core proxies to Biometric-Factor and returns WebAuthn assertion options.
```json
// request
{ "challengeId": "uuid" }
// response 200 — passthrough of Biometric-Factor's response, see section 2
```

### `POST /auth/mfa/biometric/verify`
```json
// request
{ "challengeId": "uuid", "assertionResponse": { /* WebAuthn AuthenticatorAssertionResponse JSON */ } }
// response 200
{ "factor": "biometric", "passed": true, "completedFactors": ["biometric"] }
```

### `POST /auth/mfa/voice-otp/send`
Auth Core proxies to Voice-OTP-Factor, which triggers the Twilio call.
```json
// request
{ "challengeId": "uuid" }
// response 200
{ "otpId": "uuid", "expiresAt": "ISO8601", "attemptsRemaining": 3 }
```

### `POST /auth/mfa/voice-otp/verify`
```json
// request
{ "challengeId": "uuid", "otpId": "uuid", "code": "123456" }
// response 200
{ "factor": "voice_otp", "passed": true, "completedFactors": ["biometric", "voice_otp"] }
// response 400 (wrong code)
{ "factor": "voice_otp", "passed": false, "attemptsRemaining": 2 }
```

### `POST /auth/session/finalize`
Called once `completedFactors` matches `requiredFactors`.
```json
// request
{ "challengeId": "uuid" }
// response 200
{ "sessionToken": "jwt", "expiresAt": "ISO8601" }
// response 409 if factors incomplete
{ "error": "factors_incomplete", "missing": ["voice_otp"] }
```

---

## 2. Biometric Factor — internal API (called by Auth Core only)
Implements the WebAuthn/FIDO2 relying-party role described in Doc2/Section 5
of the unified design: server never sees raw biometric data, only a
public key (enrolment) and a signed assertion (login).

### `POST /internal/biometric/register-options`
```json
{ "userId": "uuid" }
// -> WebAuthn PublicKeyCredentialCreationOptions (JSON), per @simplewebauthn/server
```

### `POST /internal/biometric/register-verify`
```json
{ "userId": "uuid", "attestationResponse": { /* ... */ } }
// -> { "registered": true }
```

### `POST /internal/biometric/login-options`
```json
{ "userId": "uuid" }
// -> WebAuthn PublicKeyCredentialRequestOptions (JSON)
```

### `POST /internal/biometric/login-verify`
```json
{ "userId": "uuid", "assertionResponse": { /* ... */ } }
// -> { "passed": true }
// After 3 failed attempts -> { "passed": false, "fallback": "device_passcode" }
```

---

## 3. Voice-OTP Factor — internal API (called by Auth Core only)
Implements Doc3/Section 6: 6-digit code, read digit-by-digit via TTS,
in-call replay (press 1 / press 2), 5-minute expiry, capped retries,
capped call-trigger rate (anti call-bombing).

### `POST /internal/voice-otp/send`
```json
{ "userId": "uuid", "phoneNumber": "+94xxxxxxxxx" }
// -> { "otpId": "uuid", "expiresAt": "ISO8601", "attemptsRemaining": 3 }
// -> 429 { "error": "rate_limited", "retryAfter": 120 } if too many calls recently
```

### `POST /internal/voice-otp/verify`
```json
{ "otpId": "uuid", "code": "123456" }
// -> { "passed": true } | { "passed": false, "attemptsRemaining": 2 }
```

### `POST /internal/voice-otp/twiml` (webhook, called by Twilio, not by Auth Core)
Returns TwiML XML that reads the code aloud and offers the `press 1 / press 2`
IVR menu described in Doc3 §3.

### `POST /internal/voice-otp/gather` (webhook, called by Twilio on DTMF input)
Handles the in-call keypad replay/repeat branch.

---

## 4. Security-Admin — internal API + shared library

### HTTP (for the admin/audit view)
`GET /internal/audit-log?userId=...&since=...` → array of audit events.

### Library interface (imported by the other 3 backend services at integration time)
```ts
logAuditEvent({ userId, factor, outcome: "success"|"failure", timestamp }): void
rateLimiter(options: { windowMs: number, max: number }): ExpressMiddleware
```
Until integration, Auth Core / Biometric-Factor / Voice-OTP-Factor call a
local no-op stub with the same signature (provided in each of their
`src/` folders) so they never block on Security-Admin being finished.

## Commit conventions

Several of us are using AI coding agents to help implement our branches.
Commits and PRs must **not** include AI co-author attribution lines (e.g.
`Co-Authored-By: <ai-tool>`). Commit as yourself only.

## Error shape (all services)
```json
{ "error": "machine_readable_code", "message": "human-readable, plain-language string" }
```
Plain-language messages matter here specifically because Doc4 requires every
error to be announced in text a screen reader can read — never a code alone.
