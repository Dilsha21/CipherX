# Threat Model — MFA for Visually Impaired Users

Source material: Doc5, the unified design, and `shared/API_CONTRACT.md`.

## Trust boundaries

1. **User device:** holds the device-bound private key, runs the accessible client, and submits the spoken OTP. A stolen or compromised device is outside the backend trust boundary.
2. **Project backend:** Auth Core, Biometric Factor, Voice-OTP Factor, and Security-Admin. Only this zone may make rate-limit decisions, count OTP guesses, record audit events, or issue sessions.
3. **Third-party voice provider:** receives only the destination number and short-lived OTP needed to place the call. It is trusted as a processor, not as an authentication decision-maker.

Every crossing between these zones requires authenticated TLS. TLS termination and service authentication are integration/deployment requirements; Helmet headers alone do not provide TLS.

## STRIDE analysis

| Threat | Concrete attack and affected component | Mitigation | Owner/status | Remaining risk |
|---|---|---|---|---|
| Spoofing | An attacker with a password pretends to be the account holder, or uses a stolen device. | WebAuthn verifies a fresh assertion signed by the enrolled device key; the orchestrator binds it to an active login attempt. | Biometric Factor and Auth Core — integration requirement. | A stolen, unlocked device or compromised authenticator may still be abused. Device revocation/recovery is out of prototype scope. |
| Tampering | A challenge, OTP result, or factor-complete message is modified or associated with another login attempt. | TLS 1.3; signed biometric challenges; stable account/attempt/OTP identifiers; Security-Admin rejects mismatched OTP-attempt tuples. | Identifier binding implemented here; TLS and signed-challenge validation are integration requirements. | A compromised backend process can submit false events or decisions; service authentication is still required. |
| Repudiation | A user or attacker denies a failed login, rate-limit decision, or session issuance. | Allow-listed append-only audit API records time, account, attempt, event, factor, outcome, and reason. | Security-Admin — implemented process-locally. | The in-memory log is neither durable nor tamper-proof. Production needs restricted access and append-only durable storage. |
| Information disclosure | A database dump exposes passwords, OTPs, biometric templates, or request secrets. | Audit logger copies only allowed metadata. Other modules must hash passwords/OTPs and never store raw biometric data. | Audit redaction implemented here; credential handling belongs to Auth Core, Voice-OTP, and Biometric Factor. | Account identifiers and authentication metadata remain sensitive; production needs encryption at rest, retention limits, and access control. |
| Denial of service | Call bombing repeatedly sends harassing calls; blind users may have greater difficulty visually screening them. | Per-account fixed-window call limit, optional trusted-source limit, active/eligible attempt requirement, retry-after response, fail-closed storage behavior. | Security-Admin implemented; Voice-OTP must call it before invoking Twilio. | Process-local counters reset on restart and are not shared across replicas. Distributed deployment requires an atomic shared store such as Redis. |
| Elevation of privilege | A session is issued after only one factor, or an OTP for one attempt is replayed against another. | OTP checks bind account, login attempt, and issued OTP; successful OTPs become consumed. Auth Core must issue a session only after every required factor passes. | OTP binding implemented here; final factor enforcement belongs to Auth Core. | A compromised orchestrator can bypass its own checks; separation of duties and service authorization are production requirements. |

## Additional abuse cases

- **OTP guessing and replay:** three attempts per issued OTP by default. Expired, exhausted, consumed, or mismatched OTP attempts are denied before comparison. Voice-OTP remains responsible for generation, hashing, expiry, and constant-time comparison.
- **Resends:** registering the same `otpId` again preserves its counter. A genuinely new `otpId` for the same active login attempt starts a new counter; Voice-OTP must apply the call limit before issuing it.
- **Simultaneous requests:** the in-memory store performs each synchronous consume operation without yielding, making it atomic within one Node process. This guarantee does not extend across processes.
- **Storage failure:** rate-limit and OTP decisions fail closed with `security_store_unavailable`. Audit logging defaults to continue-with-explicit-error so authentication availability is not silently lost; callers must monitor and escalate that result. A configurable `block` mode is available for deployments requiring fail-closed audit writes.
- **SIM-swap/call forwarding:** explicitly accepted residual risk from Doc5. The second, device-bound biometric factor limits impact but does not eliminate interception of the voice call.
