# Security-Admin — Member E

Security controls and threat-model documentation for the accessible MFA system. This module stays within `feature/security-admin` and implements the interface in `shared/API_CONTRACT.md` without calling other services directly.

## Public module interface

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

## Run

```sh
npm install
npm test
npm start
```

The service listens on port `4003` by default.
