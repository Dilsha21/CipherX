const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { axe, toHaveNoViolations } = require('jest-axe');

expect.extend(toHaveNoViolations);

describe('frontend accessibility', () => {
  it('sign-in screen has no automatically-detectable WCAG violations', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const dom = new JSDOM(html);
    const results = await axe(dom.window.document.body.innerHTML);
    expect(results).toHaveNoViolations();
  });
});
