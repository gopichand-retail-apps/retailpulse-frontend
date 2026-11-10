# RetailPulse Frontend

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

Canonical architecture and workflow details: [../docs/architecture.md](../docs/architecture.md).
