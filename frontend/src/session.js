// Holds the session token Auth Core issues after all factors pass.
//
// Deliberately memory-only: never localStorage/sessionStorage, where any
// script running on the page could read it and it would outlive the tab.
// The cost is that a reload signs the user out. If the token later needs to
// survive a reload, Auth Core should set it as an HttpOnly, Secure,
// SameSite=Strict cookie rather than this module growing a storage backend.

let token = null;
let expiryTimer = null;

export function clearSession() {
  token = null;
  clearTimeout(expiryTimer);
  expiryTimer = null;
}

export function setSession({ sessionToken, expiresAt }) {
  clearSession();
  token = sessionToken;
  const msLeft = Date.parse(expiresAt) - Date.now();
  if (Number.isFinite(msLeft)) {
    expiryTimer = setTimeout(clearSession, Math.max(msLeft, 0));
  }
}

// For future authenticated calls: `Authorization: Bearer ${getSessionToken()}`.
export function getSessionToken() {
  return token;
}
