# Security Architecture & Threat Model (Security-Admin) — Member E

**Branch:** `feature/security-admin`
**Based on:** Doc5 — Security Architecture and Threat Model
**Port:** `4003`

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

## Getting started

```
cd security-admin
npm install
npm test
npm start     # starts the internal audit-log service on :4003
```
