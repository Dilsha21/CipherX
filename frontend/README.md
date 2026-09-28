# Accessible Interaction Flow (Frontend) — Member D

**Branch:** `feature/frontend`
**Based on:** Doc4 — Accessible Interaction Flow
**Dev server port:** `5173`

## What you're building

The screen-reader-first UI that ties the three login steps into one journey:
Sign-in → Biometric prompt → Waiting-for-call → Code entry → Success/Error.
Every screen state, announcement, and error message below comes straight
from Doc4 / Section 7 of the unified design — implement them as written,
they're not placeholders:

| Screen | Announcement |
|---|---|
| Sign-in | "Sign in. Username field. Password field, secure text entry. Sign-in button." |
| Biometric prompt | "Verify your identity. Fingerprint or face check requested. Follow your device's prompt." |
| Waiting for call | "Calling your registered phone number now with your login code. This may take a few seconds." |
| Code entry | "Enter the 6-digit code you heard on the call. Code field." |
| Success | "Login successful. Welcome back." |
| Error / retry | "That code did not match. You have 2 attempts remaining. Press repeat to hear the code again." |

## Non-negotiable rules from Doc4 (these are graded requirements, not style)

- **WCAG 2.1 Level AA** throughout.
- One state/screen per step — never combine steps onto one screen (SC 4.1.3).
- No information conveyed by colour/icon/position alone — every state has a
  text label (SC 1.4.1).
- Every error announced immediately in plain language with a suggested fix,
  never a red border alone (SC 3.3.1 / 3.3.3).
- Every control: accessible label + role + minimum **44×44** touch target.
- Timers (voice-call step, code entry) generous and **extendable**, never a
  short fixed timeout (SC 2.2.1).
- **No CAPTCHA anywhere in the flow.** Do not add one even "temporarily" —
  bot mitigation is handled by rate-limiting + the device-bound biometric
  key, per Doc4 assumption D4.
- Real interaction is via the platform's own screen reader (TalkBack /
  VoiceOver / NVDA) — don't build a custom audio player; use semantic
  HTML/ARIA so those tools work automatically.

## While developing standalone

You depend only on **Auth Core's** public API
([`/shared/API_CONTRACT.md`](../shared/API_CONTRACT.md) section 1) — never
call Biometric-Factor or Voice-OTP-Factor directly. Mock Auth Core's
responses with `msw` (Mock Service Worker) or `json-server` using the exact
JSON shapes from the contract, so you never block on the backend being done.

For the biometric step specifically: use the browser's native
`navigator.credentials` WebAuthn API — no SDK install needed. Test it
without a real fingerprint sensor via Chrome DevTools → More tools →
WebAuthn → "Virtual Authenticator".

## External tools / libraries

- Plain semantic HTML/CSS/JS (or a lightweight framework if you prefer —
  keep it simple, accessibility is easier to reason about without heavy
  abstraction).
- **`axe-core`** (or `jest-axe`) — automated accessibility testing, run in
  CI to catch WCAG violations (missing labels, contrast, etc.) automatically.
- `msw` or `json-server` — mocking Auth Core during dev.
- Manual testing: actually turn on a screen reader (NVDA on Windows,
  VoiceOver on Mac) and go through the flow with your eyes closed at least
  once before calling a screen done.

## Requirements this module is responsible for

FR4, NFR1, NFR5 (bounded, sequential steps).

## Getting started

```
cd frontend
npm install
npm test    # runs axe accessibility checks + component tests
npm run dev # starts dev server on :5173
```
