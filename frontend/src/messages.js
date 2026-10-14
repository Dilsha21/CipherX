// Every string the user reads or hears lives here, so the wording can be
// reviewed against Doc4 / the README table in one place.

// Screen-entry announcements, verbatim from the README table (Doc4 /
// Section 7 of the unified design). Do not reword.
export const ANNOUNCE = {
  signIn: 'Sign in. Username field. Password field, secure text entry. Sign-in button.',
  biometric: "Verify your identity. Fingerprint or face check requested. Follow your device's prompt.",
  calling: 'Calling your registered phone number now with your login code. This may take a few seconds.',
  code: 'Enter the 6-digit code you heard on the call. Code field.',
  success: 'Login successful. Welcome back.',
};

export const TITLES = {
  signIn: 'Sign in',
  biometric: 'Step 2 of 3: Verify your identity',
  calling: 'Step 3 of 3: Calling your phone',
  code: 'Step 3 of 3: Enter your code',
  success: 'Login successful',
  stopped: 'Sign-in stopped',
};

export const STATUS = {
  codeExpiringSoon:
    'Your code expires in 1 minute. If you need more time, press Repeat call to get a new code.',
  signedOut: 'You have been signed out.',
};

export const ERRORS = {
  missingCredentials: 'Enter both your username and your password, then press Sign in.',
  invalidCredentials: 'That username or password is not correct. Check both and try again.',
  attemptExpired: 'Your sign-in attempt timed out or is no longer valid. Please sign in again.',
  unavailable:
    'We could not reach the sign-in service. Check your connection, wait a moment, and try again.',
  generic: 'Something went wrong. Please try again.',
  biometricUnsupported:
    'This browser or device does not support fingerprint or face checks. Try a different browser or device, or contact support.',
  biometricCancelled:
    'The fingerprint or face check was cancelled or timed out. Press Start fingerprint or face check to try again.',
  biometricStopped:
    'The fingerprint or face check did not succeed after 3 tries, so this sign-in has been stopped for your security. Press Start again to sign in from the beginning, or contact support.',
  codeFormat: 'The code must be exactly 6 digits. Check the code and try again.',
  codeExpired: 'Your code has expired. Press Repeat call to get a new code.',
  unknownFactor:
    'This account needs a sign-in step this app does not support. Please contact support.',
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// README: "That code did not match. You have 2 attempts remaining. Press
// repeat to hear the code again."
export function codeMismatch(attemptsRemaining) {
  if (!Number.isInteger(attemptsRemaining)) {
    return 'That code did not match. Press repeat to hear the code again.';
  }
  if (attemptsRemaining <= 0) {
    return 'That code did not match and no attempts remain. Press Repeat call to get a new code.';
  }
  return `That code did not match. You have ${plural(attemptsRemaining, 'attempt')} remaining. Press repeat to hear the code again.`;
}

export function biometricRetry(triesRemaining) {
  const tries = triesRemaining === 1 ? '1 try' : `${triesRemaining} tries`;
  return `Not recognised. You have ${tries} remaining. Press Start fingerprint or face check to try again.`;
}

export function rateLimited(retryAfterSeconds) {
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `Too many attempts. Please wait ${plural(minutes, 'minute')}, then try again.`;
  }
  return 'Too many attempts. Please wait a few minutes, then try again.';
}

export function codeValidUntil(date) {
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `This code can be used until ${time}. If you need more time, press Repeat call to get a new code.`;
}
