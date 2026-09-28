// Jest's "jsdom" test environment doesn't put TextEncoder/TextDecoder on
// the global object, but jsdom's own dependency (whatwg-url) requires them
// to exist globally just to be required. Polyfill from Node's util module
// before any test file loads jsdom.
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
