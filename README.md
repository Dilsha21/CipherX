# Multi-Factor Authentication for Visually Impaired Users

A three-factor login system — password, on-device biometric (WebAuthn/FIDO2
style), and a voice-call one-time code (Twilio) — designed so the two extra
factors can be completed entirely without reading a screen. See the design
docs in the repo root (`Doc1`–`Doc5`, and the `Unified Group Design` doc) for
the full rationale, threat model, and accessibility justification.

## Repo layout

```
/shared/            API_CONTRACT.md — the interface every module builds against
/auth-core/         Member A — orchestrator, session, password step
/biometric-factor/  Member B — WebAuthn/FIDO2 biometric verification
/voice-otp-factor/  Member C — Twilio voice-call OTP
/frontend/          Member D — accessible, screen-reader-first UI
/security-admin/    Member E — rate limiting, audit log, threat model
```

Each folder is an independent Node.js module with its own `package.json`,
its own tests, and its own README describing exactly what to build. Read
[`shared/API_CONTRACT.md`](shared/API_CONTRACT.md) first — it's the only
thing your module should depend on to talk to the others during development.

## Workflow

- **Branch:** each member works only inside their own folder, on their own
  branch (see their README for the exact name). Don't edit another folder.
- **`shared/API_CONTRACT.md`** may be extended (append-only) by anyone, but
  if you change something someone else already relies on, say so in the PR
  and tag them.
- **No direct pushes to `main`.** `main` is protected — all changes land via
  PR. CI (lint/build/test per module + a merge-conflict check) must pass
  before a PR can merge. See `.github/workflows/ci.yml`.
- **Integration branch:** once all five modules are functionally done, one
  person merges everything into an `integration` branch and replaces each
  module's local stub calls to the others with real HTTP calls per the
  contract, before merging into `main`.
- **No AI co-author attribution in commits/PRs.** If you're using an AI
  coding agent on your branch, commit as yourself — don't add
  `Co-Authored-By` lines for the tool.

## Running a module locally

```
cd <your-folder>
npm install
npm test
npm start
```

See each folder's own README for its port number and any external service
credentials it needs (e.g. Twilio).
