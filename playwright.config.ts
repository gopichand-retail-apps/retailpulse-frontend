import { defineConfig, devices } from '@playwright/test';

const isContinuousIntegration = Boolean(process.env.CI);
const frontendPort = getPort('RETAILPULSE_FRONTEND_PORT', 5701);
const apiPort = getPort('RETAILPULSE_API_PORT', 5702);
const frontendUrl = `http://localhost:${frontendPort}`;
const apiUrl = `http://127.0.0.1:${apiPort}`;
const reuseExistingServer = !isContinuousIntegration && process.env.RETAILPULSE_E2E_ISOLATED !== 'true';

if (frontendPort === apiPort) {
  throw new Error('RetailPulse frontend and API must use different E2E ports.');
}

function getPort(name: string, defaultPort: number): number {
  const port = Number(process.env[name] ?? defaultPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return port;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node src/main.mjs',
      cwd: '../retailpulse-backend',
      url: `${apiUrl}/api/v1/health`,
      reuseExistingServer,
      timeout: 30_000,
      env: {
        PORT: String(apiPort),
        RETAILPULSE_DB_PATH: ':memory:',
        RETAILPULSE_E2E_FRONTEND_ORIGIN: frontendUrl,
      },
    },
    {
      command: `npm run dev -- --port ${frontendPort}`,
      url: frontendUrl,
      reuseExistingServer,
      timeout: 30_000,
      env: {
        VITE_RETAILPULSE_API_BASE_URL: `${apiUrl}/api/v1`,
        VITE_IS_MOCK: process.env.VITE_IS_MOCK ?? 'true',
        VITE_MOCK_API_BASE_URL: process.env.VITE_MOCK_API_BASE_URL ?? `${apiUrl}/api/v1`,
        VITE_REAL_API_BASE_URL: process.env.VITE_REAL_API_BASE_URL ?? `${apiUrl}/api/v1`,
      },
    },
  ],
});
