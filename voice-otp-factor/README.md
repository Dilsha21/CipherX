# Voice-Call OTP Factor — Member C

**Branch:** `feature/voice-otp-factor`
**Based on:** Doc3 — Voice-Call OTP Factor
**Port:** `4002`

## What you're building

An internal service that:

1. Generates a random **6-digit** code, stores it **hashed** with a
   **5-minute expiry**, and asks the Voice Gateway (Twilio) to call the
   user's registered number.
2. Serves the TwiML the call plays: a short intro, the code read **digit by
   digit, slowly** ("three... one... nine..."), then an IVR menu —
   **press 1** to hear it again from the start, **press 2** to hear it
   looped one digit at a time.
3. Verifies the code the user enters in the app (or confirms via keypad
   during the call), with a **capped number of attempts**.
4. **Rate-limits how often a new call can be triggered** for one account —
   this is the anti "call-bombing" / harassment control called out as the
   **highest-severity threat** in Doc5, specifically because the target
   users may find it harder to screen/block repeated calls than a sighted
   user glancing at caller ID. Don't skip this.

Full endpoint shapes: [`/shared/API_CONTRACT.md`](../shared/API_CONTRACT.md)
section 3.

## External tools / services — action needed

- **Twilio Programmable Voice** — you need a **free Twilio trial account**:
  Account SID, Auth Token, and a Twilio voice-capable phone number. Put
  these in a local `.env` (never commit it — see `.gitignore`):
  ```
  TWILIO_ACCOUNT_SID=...
  TWILIO_AUTH_TOKEN=...
  TWILIO_PHONE_NUMBER=...
  ```
  Docs: twilio.com/docs/voice and twilio.com/docs/voice/twiml (TwiML is the
  XML that tells Twilio what to say/gather on the call).
- Twilio's webhook endpoints (`/internal/voice-otp/twiml`,
  `/internal/voice-otp/gather`) need to be reachable by Twilio's servers —
  for local dev, tunnel your `:4002` with **ngrok** (or similar) and set
  that public URL in your Twilio phone number's voice webhook config.
- **Never commit real Twilio credentials.** CI should run your non-Twilio
  logic (code generation, hashing, expiry, rate-limit) against mocks; skip
  or mock the actual `twilio` SDK call in tests.

## Requirements this module is responsible for

FR3, NFR4 (works on a basic phone line, no data connection needed), and the
Denial-of-Service mitigation in Doc5's STRIDE table (rate limiting).

## Database

Codes/expiry/attempt-counts need real persistence eventually — see
[`/shared/DATABASE.md`](../shared/DATABASE.md). You get your own Postgres
schema (`voice_otp_factor`) on the shared Neon project. `migrations/` is
set up with `node-pg-migrate` but empty — add your first migration (e.g.
an `otps` table: `user_id`, `code_hash`, `attempts_remaining`, `expires_at`)
when you get to persistence:

```
cp .env.example .env        # fill in DIRECT_DATABASE_URL
npm run migrate:create add-otps-table
npm run migrate:up
```

## Getting started

```
cd voice-otp-factor
npm install
cp .env.example .env   # fill in your Twilio trial credentials
npm test               # runs against mocks, no real Twilio calls
npm start               # starts the service on :4002
```
