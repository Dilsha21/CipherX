import { defineConfig } from 'vite';
import { authCoreMock } from './mock/authCoreMock.mjs';

// Headers a meta tag can't set. Whatever serves the built files in
// deployment must send these too (plus HSTS, once behind TLS).
const securityHeaders = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export default defineConfig(({ mode }) => {
  const mock = mode === 'mock';
  return {
    // `npm run dev:mock` answers /auth/* from an in-memory fake of Auth Core.
    // It is a dev-server plugin, so none of it can end up in a build.
    plugins: mock ? [authCoreMock()] : [],
    server: {
      port: 5173,
      strictPort: true,
      headers: securityHeaders,
      // The browser only ever talks to its own origin; the dev server
      // forwards /auth to Auth Core, so Auth Core needs no CORS allowance.
      proxy: mock
        ? undefined
        : { '/auth': { target: process.env.AUTH_CORE_URL || 'http://localhost:4000', changeOrigin: true } },
    },
    preview: { port: 5173, strictPort: true, headers: securityHeaders },
  };
});
