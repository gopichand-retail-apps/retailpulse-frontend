# RetailPulse Frontend

![CI](https://github.com/gopichand-retail-apps/retailpulse-frontend/actions/workflows/ci.yml/badge.svg)
**Live demo:** https://retailpulse-frontend-pi.vercel.app/

[Architecture guide](docs/architecture.md) — source map, workflows, contracts, data, security, and checks.

## Repository layout and Windows workflow

This is the RetailPulse React/Vite frontend repository. It keeps its own Git history, origin, package manifest, and lockfile; the API is the independent [retailpulse-backend](https://github.com/gopichand-retail-apps/retailpulse-backend) repository. Place the pair under one RetailPulse folder to use the supplied single-folder VS Code workspace.

Use Node **24.15.0** and npm with the committed lockfile. From this repository in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

The client is at http://127.0.0.1:5701; start the API separately. For both services in the complete Retail Apps workspace, use `./scripts/Start-Apps.ps1 -App RetailPulse` from the workspace root. Use `-EnvironmentName IT` only for the independent IT copies.

See the [app overview](docs/architecture.md#1-scope-users-and-repository-boundary) and [canonical architecture](docs/architecture.md). The architecture guide is included in this repository. No cross-app backend integration is added by this organization change.

React + TypeScript + Vite workspace for retail sales analytics. This repository owns the user interface, accessible filter/report views, local theme preference, and browser-side API adapter. The Node API remains authoritative for report data, alert state, and synthetic sales ingestion.

## Run and Verify

Requires Node.js 22.13 or later. Start `retailpulse-backend` first, then run:

```sh
npm ci
npm run dev
```

The UI binds to `127.0.0.1:5701` and calls the API at `127.0.0.1:5702` through its configured base URL.

```sh
npm run lint
npm run format:check
npm run test:cov
npm audit
npm run build
VITE_IS_MOCK=true npm run test:e2e
VITE_IS_MOCK=false npm run test:e2e
```

The unit suite enforces at least 90% line, statement, function, and branch
coverage. The E2E suite covers reporting filters, stores/products, alert
changes, synthetic sales ingestion, CSV export, recovery, error-copy mapping,
architecture isolation, and mobile navigation in both API-selection modes.
Its isolated API uses an in-memory SQLite database.

The GitHub Actions workflow runs formatting, lint, unit coverage, dependency
audit, both API-selection E2E modes, and a production build. SAST and
secret-history scanning are not configured.

To run the suite without reusing the local services, choose unused ports and use the isolated in-memory database:

```sh
RETAILPULSE_E2E_ISOLATED=true \
RETAILPULSE_FRONTEND_PORT=5703 \
RETAILPULSE_API_PORT=5704 \
npm run test:e2e
```

## Contract and Limitations

Visible copy and seeded display labels come from `public/retailpulse-model.json`, validated against the shared `version`/`appId`/`locale`/`messages`/`data` envelope. API requests use `/api/v1`; the API owns business metrics and persistence. Data is synthetic. Authentication and server-side role/tenant authorization are not implemented.

Canonical architecture and workflow details: [../docs/architecture.md](docs/architecture.md).

## Vercel frontend configuration

Import this frontend's GitHub repository as its own Vercel project. Set **Root Directory** to the repository root (`./`), **Node.js Version** to **24.x**, and keep the checked-in [vercel.json](vercel.json). It selects Vite, dist output, and browser-route fallback with `npm ci` and `npm run build`. The SPA fallback excludes /api and /socket.io so missing backend routes do not return HTML.

Set `VITE_IS_MOCK=true` and `VITE_MOCK_API_BASE_URL` to an approved isolated HTTPS API **base including /api/v1**. For the other selector, set `VITE_IS_MOCK=false` and `VITE_REAL_API_BASE_URL`. The [environment template](.env.vercel.example) lists exact names; it is documentation, not an automatically loaded production configuration. Replace its reserved .invalid host. Changing mode or endpoints requires a new build/deployment. Both selectors still call an API; neither creates a browser-only backend or real provider integration.

Production Vite assets do not contain the development proxy; requests use the configured absolute API URL. A hosted API needs independently verified identity, persistence, exact origin/CORS and session/CSRF settings. Existing APIs remain local-only; localhost in a deployed bundle would point at the visitor or build machine.

The configuration adds noindex, frame/content-type/referrer/permission protections and no-store for the active UI model. Headers and noindex do not provide access control. Keep preview deployment protection enabled and use synthetic data. Hosted routing, cookies, headers, and user workflows have **not** been verified; no deployment is performed.

Known release gaps: No authentication or authorization: keep the API loopback-only. Four formatting failures and desktop-to-320px Products overflow remain in the baseline; fresh mobile viewports pass.
