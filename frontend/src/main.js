// TODO(Member D): wire up the full login journey against Auth Core's
// public API (/shared/API_CONTRACT.md section 1). Mock it with msw/json-server
// while Auth Core is still being built.

document.getElementById('login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  // TODO: POST /auth/login, then drive the biometric/voice-otp/success states.
});
