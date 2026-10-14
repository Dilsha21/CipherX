import { createAuthCoreClient } from './api.js';
import { createApp } from './flow.js';
import * as session from './session.js';
import * as webauthn from './webauthn.js';

createApp({
  doc: document,
  api: createAuthCoreClient(),
  webauthn,
  session,
});
