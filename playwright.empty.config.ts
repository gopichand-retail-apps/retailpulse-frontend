import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * A fresh install on the API's default profile (no RETAILPULSE_PROFILE): proves that no invented figures reach
 * the screen or the export. Same ports and data-mode switches as the main suite; run it on its own, not in
 * parallel with `npm run test:e2e`.
 */
const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base,
  testDir: './e2e',
  testMatch: '**/*.empty.ts',
  webServer: servers.map((server, index) =>
    // Index 0 is the API in playwright.config.ts. An empty value means "not set", so the default profile applies.
    index === 0 ? { ...server, env: { ...server.env, RETAILPULSE_PROFILE: '' } } : server,
  ),
});
