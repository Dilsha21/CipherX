// Error shape per /shared/API_CONTRACT.md: { error, message }
// `message` must always be plain-language text, since the frontend needs it
// for screen-reader announcements (Doc4) — never a code alone.

function apiError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

module.exports = { apiError };
