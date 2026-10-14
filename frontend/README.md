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
npm test          # axe accessibility checks on every screen + flow/API/WebAuthn tests
npm run dev:mock  # :5173, Auth Core faked in-memory (no backend needed)
npm run dev       # :5173, /auth proxied to the real Auth Core on :4000
npm run build     # static files in dist/
```

**Mock mode** (`mock/authCoreMock.mjs`, a dev-server plugin that cannot end
up in a build): sign in as `demo` / `demo-password`. The "phone call" is
printed in the terminal running the dev server. For the biometric step,
add a Virtual Authenticator in Chrome DevTools (More tools → WebAuthn;
enable *resident keys* and *user verification*), then open
`http://localhost:5173/__mock/enrol` once to create a passkey.

**Against the real backend:** start Auth Core, then `npm run dev`. Set
`AUTH_CORE_URL` if it isn't on `http://localhost:4000`.

## How it's put together

| File | Job |
|---|---|
| `index.html` | All six screens as semantic HTML; one is un-`hidden` at a time. |
| `src/flow.js` | The state machine: screen changes, announcements, focus, errors, timers. |
| `src/api.js` | Auth Core client (contract section 1). The only place `fetch` is called. |
| `src/webauthn.js` | base64url ⇄ ArrayBuffer and `navigator.credentials.get`. |
| `src/session.js` | In-memory session token. |
| `src/messages.js` | Every string the user reads or hears. |

Accessibility mechanics: a `role="status"` region carries the screen-entry
announcement from the table above, a `role="alert"` region carries errors
(always prefixed "Error:", and tied to the field with `aria-invalid` /
`aria-describedby`), and focus moves to the new screen's heading or field on
every transition. The code timer warns one minute before expiry, never
navigates away or clears input when it lapses, and "Repeat call" gets a new
code and a fresh five minutes.

## How the frontend talks to the backend securely

- **One origin.** The browser only requests relative `/auth/...` paths. The
  dev server proxies them to Auth Core; deployment needs a reverse proxy
  doing the same behind TLS. Auth Core therefore needs no CORS allowance.
- **Never trusts itself.** The frontend doesn't decide a factor passed. It
  moves on only when Auth Core says so, and if `finalize` answers
  `factors_incomplete` it goes back and does the missing factor.
- **Strict CSP** (meta tag in `index.html`): scripts, styles and connections
  from `'self'` only, everything else denied. There is no inline script,
  inline style or third-party runtime dependency. `frame-ancestors 'none'`,
  `nosniff` and `Referrer-Policy` can't be set from a meta tag — they're
  sent as headers in `vite.config.mjs` and **must be replicated (plus HSTS)
  by whatever serves `dist/` in deployment.**
- **No HTML injection path.** All dynamic text, including server-supplied
  error messages, is written with `textContent`.
- **Secrets are short-lived in the page.** The password field is cleared as
  soon as the login request returns. The session token lives in a module
  variable only — not `localStorage`/`sessionStorage` — so a reload signs
  the user out.
- **Biometrics stay on the device.** Only the server's challenge goes in
  and a signed assertion comes out, via the browser's native WebAuthn API.
- Requests time out after 15 s, refuse redirects, and are not cached.

## Known gaps (need another member, or a human)

1. **No biometric enrolment in Auth Core's public API.** The contract only
   exposes `register-options` / `register-verify` on Biometric-Factor's
   internal API, which the frontend must not call. Until Auth Core proxies
   them, no real user can have a credential to sign in with. (Members A, B)
2. **Challenge lifetime is a fixed 10 minutes** (`auth-core` challenge
   store) and isn't returned to the client, so the frontend can't warn
   about it or extend it — it can only explain after the fact. That is in
   tension with WCAG SC 2.2.1 for the journey as a whole. (Member A)
3. **Auth Core drops the `fallback: "device_passcode"` field** from
   Biometric-Factor's verify response, so the frontend counts the three
   tries itself for wording only. (Member A)
4. **Not yet done: a real screen-reader pass** (VoiceOver / NVDA / TalkBack)
   and a real-browser WebAuthn run. jsdom can't check contrast, target size
   or what a screen reader actually says.
