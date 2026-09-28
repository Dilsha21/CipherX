# Biometric Factor — Member B

**Branch:** `feature/biometric-factor`
**Based on:** Doc2 — Biometric Authentication Factor
**Port:** `4001`

## What you're building

An internal service implementing the **WebAuthn/FIDO2 relying-party role**
described in Doc2 / Section 5 of the unified design:

- **Enrolment:** generate registration options; verify the attestation the
  browser/device sends back; store only the **public key**, never any
  biometric data.
- **Login:** generate a random challenge; verify the signed assertion the
  device sends back against the stored public key.
- **Fallback:** after 3 failed checks, report `fallback: "device_passcode"`
  (the actual passcode fallback happens on-device — you just need to report
  that this is attempt #3 and stop counting it against the account).

Nothing in this service ever receives or stores a fingerprint image, face
scan, or biometric template — only public keys and signed challenges. This
is the core security property called out in Doc2 and Doc5 (assumption E3):
a full server breach cannot leak biometric data because none is ever there.

Full endpoint shapes: [`/shared/API_CONTRACT.md`](../shared/API_CONTRACT.md)
section 2.

## External tools / libraries

- **`@simplewebauthn/server`** — implements the WebAuthn relying-party
  protocol server-side (generating challenges, verifying attestations and
  assertions). This is the standard way to build a FIDO2/WebAuthn RP without
  writing crypto by hand.
- On the client side (owned by Frontend, but good to know): the browser's
  built-in `navigator.credentials` WebAuthn API. No SDK needed there — it's
  a native browser API. For manual testing without a physical
  fingerprint/face sensor, use Chrome DevTools → More tools → WebAuthn →
  "Virtual Authenticator" to simulate a security key/biometric device.
- No account/API key needed for this module — WebAuthn is self-hosted.

## Testing without a real device

Write unit tests using `@simplewebauthn/server`'s own test helpers /
generated fixtures for attestation and assertion responses (see their repo's
test suite for example payloads) so CI doesn't need a real browser or
sensor. Manual end-to-end testing with a real device happens once Frontend
is wired up.

## Requirements this module is responsible for

FR2, FR5 (the 3-strikes fallback), NFR2 (device-bound factor).

## Getting started

```
cd biometric-factor
npm install
npm test
npm start     # starts the service on :4001
```
