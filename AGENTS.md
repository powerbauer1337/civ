# Repository Guidelines

## Project Structure & Module Organization
- **Root (npm workspaces):** `client/` (React + Vite), `server/` (Node/Express/Socket.io), `shared/` (types/utilities). 
- **Source:** `client/src/`, `server/src/`, `shared/src/`. Tests: `server/tests/`, `shared/src/__tests__/`, client uses Vitest in `client/src`.
- **Docs/Infra:** `docs/`, `.github/workflows/`, `Dockerfile`, `docker-compose*.yml`, `nginx/`.

## Build, Test, and Development Commands
- Install all: `npm install` (root) or `npm run install:all`.
- Dev (client + server): `npm run dev` → Vite on :5173, server on :3001.
- Build (server + shared): `npm run build`; client: `cd client && npm run build`.
- Tests (all): `npm test`. Per package: 
  - Client: `cd client && vitest` or `vitest run --coverage`.
  - Server: `cd server && npm test` or `npm run test:watch`/`test:coverage`.
  - Shared: `cd shared && npm test`.
- Lint: `npm run lint` (or per package `npm run lint`).
- Docker (dev stack): `docker compose -f docker-compose.dev.yml up --build`.

## Coding Style & Naming Conventions
- **Language:** TypeScript 5; Node 18+; ES2020.
- **Formatting (ESLint):** single quotes, semicolons, no trailing spaces, `prefer-const`, `no-var`, `eol-last`, no `console` outside tests. Indent with 2 spaces.
- **Files:** React components `PascalCase.tsx`; hooks `useX.ts`; utilities/types `camelCase.ts`; constants `UPPER_SNAKE_CASE`. Tests `*.test.ts(x)`.

## Testing Guidelines
- **Frameworks:** Client = Vitest; Server/Shared = Jest.
- **Where:** Unit tests near code (`shared/src/__tests__`) or in `server/tests`/client source.
- **Coverage:** Aim ≥ 80% on changed lines; run `npm run test:coverage` (server) and `vitest run --coverage` (client) before PRs.

## Commit & Pull Request Guidelines
- **Commits:** Conventional Commits style, e.g., `feat(server): add city production queue`, `fix(client): prevent hex drag jitter`.
- **PRs:** Include purpose, linked issues (`Closes #123`), test plan/results, and screenshots/GIFs for UI. Keep diffs focused; update docs when behavior changes. Ensure CI (build, tests, lint) is green.

## Security & Configuration Tips
- Never commit secrets. Configure via env vars (see `docker-compose*.yml`): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET`.
- Keep debug endpoints off in production; respect CORS and rate limits. Avoid logging sensitive data.

## PR Checklist & Git Hooks
- **PR Template:** Uses `.github/pull_request_template.md` with required checks (tests, lint, typecheck, screenshots for UI, linked issues).
- **Enable hooks:** `git config core.hooksPath .githooks && chmod +x .githooks/*`.
- **Pre-commit:** Lints repo and typechecks all packages fast.
- **Pre-push:** Runs unit tests for server/shared and client.
