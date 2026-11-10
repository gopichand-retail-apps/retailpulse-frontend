# APP-07 RetailPulse - Agent Instructions

This repository owns the RetailPulse frontend. Before changes, read `~/Downloads/PORTFOLIO_COMPLETE_AGENT_PLAYBOOK.md` and `~/Downloads/APP-07_RETAILPULSE.md`; those are the full architecture, UX, security, and delivery requirements.

## Mandatory Content Model and Product UI
- All user-facing copy and synthetic display content must come from `public/retailpulse-model.json`, using the strict `version`, `appId`, `locale`, `messages`, and `data` envelope. Validate it with Zod, fetch with `cache: "no-store"`, verify the app ID, and set document language/title/description from the model.
- Do not add English fallbacks or architecture diagrams, patterns, roadmaps, or engineering instructions to the product UI. Keep architecture in the canonical developer-facing `docs/architecture.md`.
- Map API errors by stable code and model copy; never render backend messages. Backend data remains authoritative for sales, inventory snapshots, permissions, and alert state.
- Debounce server-backed search (deferred rendering alone is not network debounce), cancel stale requests, and keep server filtering bounded.
- Test locale/copy replacement and visible failure for invalid models or missing mappings.

## Mandatory code quality
- TypeScript strict mode. Avoid `any`, unsafe assertions, unchecked promises, silent error swallowing, and broad lint disables.
- Keep TS/JS/Java lines at or below 120 characters, except documented URLs, schemas, and generated code. Enforce with ESLint `max-len`, Prettier `printWidth`, or Java Checkstyle as applicable.
- Cognitive complexity is at most 15 per function. Control-flow nesting is at most 3 where feasible.
- Target at most 50 logical lines per function, 400 lines per source file except justified compositions/generated code, and 4 positional parameters. Prefer named parameter objects.
- No unused or duplicate code, unreachable branches, hard-coded credentials, production `console.log`, magic business constants, or circular dependencies.
- New-code gate: zero new blocker/critical issues, at most 3% duplication, all security hotspots reviewed, and no high-confidence leaked secrets. Verify actual Sonar rule/edition support; do not assume defaults match.

## Testing and CI
- Enforce at least 90% for each line, statement, function, and branch metric; at least 95% for critical domain logic and 90% changed-code coverage. Exclusions must be narrow, justified, and transparent.
- Test dashboards for loading/empty/error/success states, keyboard/accessibility, authorization, filter/input validation, export permissions, and recovery as applicable.
- CI must block on formatting, lint, typecheck/build, unit/integration/E2E, all four coverage thresholds, dependency and configured security/secret scans, and configured quality-gate failures. Report missing/skipped checks distinctly.

## Security, logging, and documentation
- RetailPulse currently has no authentication or resource authorization and must remain loopback-only; CORS is not authorization. Do not describe the synthetic analyst label as a credential. Add server-side role/tenant ownership and negative tests before external exposure.
- Validate filters and exports, use bounded request bodies, parameterized persistence, and spreadsheet-safe CSV output.
- Never log credentials, tokens, raw payloads, or identifying financial data. Use structured success/failure logs with request and trace IDs; verify redaction.
- Maintain canonical developer-facing `docs/architecture.md` with C4/trust boundaries, data ownership, API and authorization matrix, implemented use cases and failures/recovery, actual integrations, startup/configuration, tests/coverage, and known gaps. Never show architecture diagrams or design patterns in product UI.
- Sales are synthetic; no POS, identity, payment, carrier, or PortfolioOps integration is configured. README covers purpose, local setup, limits, and versioned integrations.
- Use synthetic records. Never claim security or compliance based only on checklists or automated scans.
