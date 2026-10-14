// Thin wrapper over the browser's native WebAuthn API (navigator.credentials).
// The server speaks JSON with base64url-encoded binary fields (the
// @simplewebauthn/server convention); the browser API wants ArrayBuffers.
// Nothing biometric ever passes through here — only a challenge going in and
// a signed assertion coming out.

export function base64urlToBuffer(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isWebAuthnSupported(win = globalThis) {
  return Boolean(win.PublicKeyCredential && win.navigator && win.navigator.credentials);
}

export function decodeRequestOptions(json) {
  // Tolerate the options arriving bare or wrapped, since Auth Core passes
  // through whatever Biometric-Factor returns.
  const options = json.publicKey || json.options || json;
  if (typeof options.challenge !== 'string') {
    throw new TypeError('WebAuthn request options are missing a challenge');
  }
  return {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: (options.allowCredentials || []).map((cred) => ({
      ...cred,
      id: base64urlToBuffer(cred.id),
    })),
  };
}

export function encodeAssertion(credential) {
  const { response } = credential;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : undefined,
    },
    clientExtensionResults:
      typeof credential.getClientExtensionResults === 'function' ? credential.getClientExtensionResults() : {},
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
}

// Triggers the platform's own fingerprint/face/passcode dialog and resolves
// with the assertion as JSON, ready to POST to /auth/mfa/biometric/verify.
export async function getAssertion(optionsJSON, { credentials = globalThis.navigator.credentials } = {}) {
  const credential = await credentials.get({ publicKey: decodeRequestOptions(optionsJSON) });
  if (!credential) throw new DOMException('No credential returned', 'NotAllowedError');
  return encodeAssertion(credential);
}
