const { axe, toHaveNoViolations } = require('jest-axe');
const {
  mountApp, $, visibleScreen, submitSignIn, click, submitCode, reachCodeScreen, apiError,
} = require('./helpers');

expect.extend(toHaveNoViolations);

// jsdom can't compute layout or colour, so this catches structural WCAG
// problems (labels, roles, names, landmarks) on every screen state. Contrast
// and target size are handled in styles.css and need a manual check.
describe('frontend accessibility', () => {
  const check = async () => expect(await axe(document.body)).toHaveNoViolations();

  it('sign-in screen has no automatically-detectable WCAG violations', async () => {
    mountApp();
    await check();
  });

  it('sign-in screen with an error', async () => {
    mountApp({ api: { login: jest.fn().mockRejectedValue(apiError('invalid_credentials', 401)) } });
    await submitSignIn();
    expect($('password').getAttribute('aria-invalid')).toBe('true');
    await check();
  });

  it('biometric screen', async () => {
    mountApp();
    await submitSignIn();
    expect(visibleScreen()).toBe('biometric');
    await check();
  });

  it('waiting-for-call screen', async () => {
    mountApp();
    await submitSignIn();
    await click('biometric-start');
    expect(visibleScreen()).toBe('calling');
    await check();
  });

  it('code-entry screen, with and without an error', async () => {
    mountApp({ api: { verifyVoiceOtp: jest.fn().mockResolvedValue({ passed: false, attemptsRemaining: 2 }) } });
    await reachCodeScreen();
    expect(visibleScreen()).toBe('code');
    await check();
    await submitCode('123456');
    await check();
  });

  it('success screen', async () => {
    mountApp();
    await reachCodeScreen();
    await submitCode('123456');
    expect(visibleScreen()).toBe('success');
    await check();
  });

  it('stopped screen', async () => {
    mountApp({ api: { biometricVerify: jest.fn().mockRejectedValue(apiError('factor_failed', 401)) } });
    await submitSignIn();
    await click('biometric-start');
    await click('biometric-start');
    await click('biometric-start');
    expect(visibleScreen()).toBe('stopped');
    await check();
  });

  it('every control has an accessible name and exactly one screen is shown at a time', () => {
    mountApp();
    document.querySelectorAll('button').forEach((button) => expect(button.textContent.trim()).not.toBe(''));
    document.querySelectorAll('input').forEach((input) => {
      expect(document.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    });
    expect(document.querySelectorAll('[data-screen]:not([hidden])')).toHaveLength(1);
  });

  it('contains no CAPTCHA and no inline script or style', () => {
    mountApp();
    expect(document.documentElement.innerHTML).not.toMatch(/captcha/i);
    expect(document.querySelectorAll('script:not([src]), style, [style], [onclick]')).toHaveLength(0);
  });
});
