import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const frontendPort = process.env.RETAILPULSE_FRONTEND_PORT ?? "5703";
const apiPort = process.env.RETAILPULSE_API_PORT ?? "5704";
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const unavailableApiBaseUrl = "http://127.0.0.1:1/api/v1";
const isMock = process.env.VITE_IS_MOCK ?? "true";
const environment = {
  ...process.env,
  RETAILPULSE_FRONTEND_PORT: frontendPort,
  RETAILPULSE_API_PORT: apiPort,
  RETAILPULSE_E2E_ISOLATED: process.env.RETAILPULSE_E2E_ISOLATED ?? "true",
  VITE_IS_MOCK: isMock,
  VITE_MOCK_API_BASE_URL:
    process.env.VITE_MOCK_API_BASE_URL ??
    (isMock === "true" ? apiBaseUrl : unavailableApiBaseUrl),
  VITE_REAL_API_BASE_URL:
    process.env.VITE_REAL_API_BASE_URL ??
    (isMock === "false" ? apiBaseUrl : unavailableApiBaseUrl),
};

const packageRunner = isWindows ? "npx.cmd" : "npx";
const result = spawnSync(packageRunner, ["playwright", "test"], {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
  shell: isWindows,
});
if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
}
process.exitCode = result.status ?? 1;
