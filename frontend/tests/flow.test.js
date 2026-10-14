const {
  mountApp, $, flush, visibleScreen, statusText, errorText,
  submitSignIn, click, submitCode, reachCodeScreen, apiError,
} = require('./helpers');

describe('login journey', () => {
  it('walks sign-in → biometric → call → code → success, announcing each screen as the README specifies', async () => {
    const { api, session } = mountApp();
    expect(visibleScreen()).toBe('signIn');
    expect(statusText()).toBe('Sign in. Username field. Password field, secure text entry. Sign-in button.');

    await submitSignIn('demo', 'pw');
    expect(api.login).toHaveBeenCalledWith('demo', 'pw');
    expect(visibleScreen()).toBe('biometric');
    expect(statusText()).toBe(
      "Verify your identity. Fingerprint or face check requested. Follow your device's prompt.",
    );
    expect(document.activeElement.tagName).toBe('H1');

    await click('biometric-start');
    expect(api.biometricVerify).toHaveBeenCalledWith('c-1', { id: 'cred' });
    expect(visibleScreen()).toBe('calling');
    expect(statusText()).toBe(
      'Calling your registered phone number now with your login code. This may take a few seconds.',
    );
    expect(api.sendVoiceOtp).toHaveBeenCalledWith('c-1');

    await click('calling-continue');
    expect(visibleScreen()).toBe('code');
    expect(statusText()).toBe('Enter the 6-digit code you heard on the call. Code field.');
    expect(document.activeElement).toBe($('code'));

    await submitCode('123 456');
    expect(api.verifyVoiceOtp).toHaveBeenCalledWith('c-1', 'o-1', '123456');
    expect(api.finalizeSession).toHaveBeenCalledWith('c-1');
    expect(session.setSession).toHaveBeenCalledWith(expect.objectContaining({ sessionToken: 'jwt' }));
    expect(visibleScreen()).toBe('success');
    expect(statusText()).toBe('Login successful. Welcome back.');
    expect(document.title).toBe('Login successful');
  });

  it('never leaves the password or the session token in the page', async () => {
    mountApp();
    await reachCodeScreen();
    expect($('password').value).toBe('');
    await submitCode('123456');
    expect(document.documentElement.innerHTML).not.toContain('jwt');
  });

  it('rejects empty credentials without calling the server', async () => {
    const { api } = mountApp();
    await submitSignIn('', '');
    expect(api.login).not.toHaveBeenCalled();
    expect(errorText()).toMatch(/^Error: Enter both your username and your password/);
    expect(document.activeElement).toBe($('username'));
  });

  it('announces wrong credentials in plain language and keeps focus on the field', async () => {
    mountApp({ api: { login: jest.fn().mockRejectedValue(apiError('invalid_credentials', 401)) } });
    await submitSignIn();
    expect(visibleScreen()).toBe('signIn');
    expect(errorText()).toBe('Error: That username or password is not correct. Check both and try again.');
    expect($('password').value).toBe('');
    expect($('password').getAttribute('aria-describedby')).toBe('error');
    expect(document.activeElement).toBe($('password'));
  });

  it('tells the user when the service cannot be reached', async () => {
    mountApp({ api: { login: jest.fn().mockRejectedValue(apiError('network', 0)) } });
    await submitSignIn();
    expect(errorText()).toMatch(/could not reach the sign-in service/);
  });

  it('renders server-supplied text as text, never as markup', async () => {
    const hostile = apiError('weird', 400, { message: '<img src=x onerror=alert(1)>' });
    mountApp({ api: { login: jest.fn().mockRejectedValue(hostile) } });
    await submitSignIn();
    expect($('error').querySelector('img')).toBeNull();
    expect(errorText()).toContain('<img src=x onerror=alert(1)>');
  });

  it('ignores a second submit while the first is still in flight', async () => {
    let resolve;
    const login = jest.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    mountApp({ api: { login } });
    await submitSignIn();
    expect($('sign-in-button').getAttribute('aria-disabled')).toBe('true');
    await submitSignIn();
    expect(login).toHaveBeenCalledTimes(1);
    resolve({ challengeId: 'c-1', requiredFactors: ['biometric'], completedFactors: [] });
    await flush();
    expect($('sign-in-button').hasAttribute('aria-disabled')).toBe(false);
  });

  describe('biometric step', () => {
    it('does not count a cancelled device prompt as a failed try', async () => {
      const getAssertion = jest.fn().mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
      const { api } = mountApp({ webauthn: { getAssertion } });
      await submitSignIn();
      for (let i = 0; i < 4; i += 1) await click('biometric-start');
      expect(api.biometricVerify).not.toHaveBeenCalled();
      expect(visibleScreen()).toBe('biometric');
      expect(errorText()).toMatch(/cancelled or timed out/);
    });

    it('counts down server-rejected tries, then stops the sign-in after the third', async () => {
      mountApp({ api: { biometricVerify: jest.fn().mockRejectedValue(apiError('factor_failed', 401)) } });
      await submitSignIn();
      await click('biometric-start');
      expect(errorText()).toMatch(/Not recognised\. You have 2 tries remaining/);
      await click('biometric-start');
      expect(errorText()).toMatch(/You have 1 try remaining/);
      await click('biometric-start');
      expect(visibleScreen()).toBe('stopped');
      expect(statusText()).toMatch(/did not succeed after 3 tries/);

      await click('stopped-restart');
      expect(visibleScreen()).toBe('signIn');
    });

    it('explains when the browser has no WebAuthn support', async () => {
      const { api } = mountApp({ webauthn: { isWebAuthnSupported: () => false } });
      await submitSignIn();
      await click('biometric-start');
      expect(api.biometricChallenge).not.toHaveBeenCalled();
      expect(errorText()).toMatch(/does not support fingerprint or face checks/);
    });
  });

  describe('voice-call step', () => {
    it('announces a wrong code exactly as the README specifies and clears the field', async () => {
      mountApp({ api: { verifyVoiceOtp: jest.fn().mockResolvedValue({ passed: false, attemptsRemaining: 2 }) } });
      await reachCodeScreen();
      await submitCode('000000');
      expect(errorText()).toBe(
        'Error: That code did not match. You have 2 attempts remaining. Press repeat to hear the code again.',
      );
      expect($('code').value).toBe('');
      expect($('code').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe($('code'));
    });

    it('validates the code format locally', async () => {
      const { api } = mountApp();
      await reachCodeScreen();
      await submitCode('12ab');
      expect(api.verifyVoiceOtp).not.toHaveBeenCalled();
      expect(errorText()).toMatch(/must be exactly 6 digits/);
    });

    it('Repeat call requests a new code and returns to the waiting screen', async () => {
      const { api } = mountApp();
      await reachCodeScreen();
      await click('code-repeat');
      expect(api.sendVoiceOtp).toHaveBeenCalledTimes(2);
      expect(visibleScreen()).toBe('calling');
    });

    it('shows how long to wait when calls are rate limited, and offers to call again', async () => {
      const sendVoiceOtp = jest.fn().mockRejectedValue(apiError('rate_limited', 429, { retryAfter: 120 }));
      mountApp({ api: { sendVoiceOtp } });
      await submitSignIn();
      await click('biometric-start');
      expect(visibleScreen()).toBe('calling');
      expect(errorText()).toBe('Error: Too many attempts. Please wait 2 minutes, then try again.');
      expect($('calling-continue').hidden).toBe(true);
      expect($('calling-retry').hidden).toBe(false);
    });

    it('warns before the code expires and never navigates away when it does', async () => {
      jest.useFakeTimers();
      try {
        mountApp();
        await reachCodeScreen();
        $('code').value = '123';

        jest.advanceTimersByTime(4 * 60 * 1000 + 1000);
        expect(statusText()).toMatch(/expires in 1 minute/);

        jest.advanceTimersByTime(60 * 1000);
        expect(errorText()).toBe('Error: Your code has expired. Press Repeat call to get a new code.');
        expect(visibleScreen()).toBe('code');
        expect($('code').value).toBe('123');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  it('sends the user back to sign-in with an explanation when the attempt has expired server-side', async () => {
    mountApp({ api: { verifyVoiceOtp: jest.fn().mockRejectedValue(apiError('invalid_challenge', 400)) } });
    await reachCodeScreen();
    await submitCode('123456');
    expect(visibleScreen()).toBe('signIn');
    expect(errorText()).toMatch(/timed out or is no longer valid/);
  });

  it('defers to Auth Core when it reports a factor is still missing', async () => {
    const finalizeSession = jest.fn().mockRejectedValue(apiError('factors_incomplete', 409, { missing: ['biometric'] }));
    const { session } = mountApp({ api: { finalizeSession } });
    await reachCodeScreen();
    await submitCode('123456');
    expect(session.setSession).not.toHaveBeenCalled();
    expect(visibleScreen()).toBe('biometric');
  });

  it('skips factors the server does not require, and stops on one it does not know', async () => {
    const only = (requiredFactors) => ({
      login: jest.fn().mockResolvedValue({ challengeId: 'c-1', requiredFactors, completedFactors: [] }),
    });
    mountApp({ api: only(['voice_otp']) });
    await submitSignIn();
    expect(visibleScreen()).toBe('calling');

    mountApp({ api: only(['retina']) });
    await submitSignIn();
    expect(visibleScreen()).toBe('stopped');
  });

  it('sign out clears the session and returns to sign-in', async () => {
    const { session } = mountApp();
    await reachCodeScreen();
    await submitCode('123456');
    await click('sign-out');
    expect(session.clearSession).toHaveBeenCalled();
    expect(visibleScreen()).toBe('signIn');
    expect(statusText()).toBe('You have been signed out.');
  });

  it('Cancel and start again abandons the attempt', async () => {
    mountApp();
    await submitSignIn();
    document.querySelector('[data-screen="biometric"] [data-action="restart"]').click();
    expect(visibleScreen()).toBe('signIn');
  });
});
