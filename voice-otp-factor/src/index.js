const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks post form-encoded

// TODO(Member C): implement per /shared/API_CONTRACT.md section 3
// - POST /internal/voice-otp/send     (generate code, hash+store, trigger Twilio call, rate-limit)
// - POST /internal/voice-otp/verify   (check code, capped attempts, 5-min expiry)
// - POST /internal/voice-otp/twiml    (Twilio webhook -> TwiML: read digits, press 1 / press 2)
// - POST /internal/voice-otp/gather   (Twilio webhook -> handle DTMF replay branch)

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'voice-otp-factor' }));

const PORT = process.env.PORT || 4002;
if (require.main === module) {
  app.listen(PORT, () => console.log(`voice-otp-factor listening on :${PORT}`));
}

module.exports = app;
