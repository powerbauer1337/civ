# AGENTS.md — Working In This Repo

Authoritative instructions for AI/code agents contributing to this project. These rules apply to the entire repository unless a more specific AGENTS.md exists deeper in a subfolder.

## Project Layout
- Root workspaces: `client/` (React + Vite), `server/` (Node/Express/Socket.io), `shared/` (types/utilities)
- Source: `client/src/`, `server/src/`, `shared/src/`
- Tests: `server/tests/` and `server/src/**/__tests__/`; `shared/src/__tests__/`; client tests live in `client/src/`
- Docs & infra: `docs/`, `.github/`, `Dockerfile`, `docker-compose*.yml`, `nginx/`, `scripts/doc-tracker/`

## Toolchain & Standards
- Node `>=18`, npm `>=9`, TypeScript `5.x`, ES2020 modules
- ESLint (.eslintrc.cjs):
  - single quotes, semicolons, 2-space indent, no trailing spaces, `prefer-const`, `no-var`, `eol-last`
  - `no-console` enforced except in tests — use `@civ-game/shared` logger utilities instead
- File naming: React components `PascalCase.tsx`; hooks `useX.ts`; utilities/types `camelCase.ts`; constants `UPPER_SNAKE_CASE`; tests `*.test.ts(x)`

## Install, Run, Build
- Install all workspaces: `npm install` (root) or `npm run install:all`
- Dev (concurrent): `npm run dev`
  - Client: http://localhost:5173
  - Server/API/WebSocket: http://localhost:3001 (`/api`, `/health`)
- Build (server + shared): `npm run build`
- Build client: `cd client && npm run build`

## Tests & Coverage
- Root: `npm test` runs shared + server suites
- Client (Vitest): `cd client && vitest` or `vitest run --coverage`
- Server (Jest): `cd server && npm test` or `npm run test:watch` / `npm run test:coverage`
- Shared (Jest): `cd shared && npm test`
- Focused server game loop: `npm run test:server:game-loop`
- Coverage goal: aim ≥ 80% on changed lines. Add or update tests alongside code changes before opening a PR.

## Lint & Typecheck
- Lint all: `npm run lint` (runs server/shared; client has its own config)
- Client lint: `cd client && npm run lint`
- Typecheck quickly (same as pre-commit):
  - `npx tsc -p client/tsconfig.json --noEmit`
  - `npx tsc -p server/tsconfig.json --noEmit`
  - `npx tsc -p shared/tsconfig.json --noEmit`

## Documentation Workflow
- Documentation index is managed by the tracker in `scripts/doc-tracker/`.
- Keep `docs/PROJECT_INDEX.md` in sync by running:
  - `npm run docs:scan` → detect docs
  - `npm run docs:update` → update index
  - `npm run docs:validate` → validate docs (also run in pre-commit)
  - `npm run docs:report` → coverage/reporting
- Fix routine issues automatically: `npm run docs:fix`

## Git Hooks (Required)
- Enable hooks once locally:
  - `git config core.hooksPath .githooks && chmod +x .githooks/*`
- Pre-commit: lints repo, typechecks client/server/shared, validates docs
  - Set `DOC_TRACKER_STRICT=true` to block commits on docs issues
- Pre-push: runs server/shared tests, then client tests

## Environment & Secrets
- Do not commit secrets. Use env vars or `.env` locally.
- Key variables (see `server/src/config/config.ts`):
  - Core: `NODE_ENV`, `PORT` (default 3001), `CLIENT_URL` (default http://localhost:5173)
  - Persistence: `PERSISTENCE_PROVIDER` = `sqlite` | `postgres` (default `sqlite`), `SQLITE_DB_PATH`
  - Databases: `DATABASE_URL` (required in production), `REDIS_URL`
  - Auth: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` (required in prod; generated for dev if missing)
  - Limits/Security: `RATE_LIMIT_*`, `ENABLE_SECURITY_HEADERS`, `ENABLE_CORS_CREDENTIALS`, `REQUEST_TIMEOUT_MS`
  - Features: `ENABLE_AI_PLAYERS`, `ENABLE_SPECTATORS`, `ENABLE_REPLAYS`, `ENABLE_DEBUG_ENDPOINTS`
- Note: With `PERSISTENCE_PROVIDER=postgres`, Save/Load socket features are currently disabled; `sqlite` enables `GamePersistence` for Save/Load.

## Docker (Optional)
- Dev stack: `docker compose -f docker-compose.dev.yml up --build`
  - Exposes client `:5173`, server `:3001`, Postgres `:5433`, Redis `:6380`
- Compose default: `docker compose up --build`
  - Exposes server `:3001`, client dev on `:3000` (proxied), Postgres `:5432`, Redis `:6379`

## Logging & Security
- Do not use `console.*` in production code. Import `logger` from `@civ-game/shared/utils` or `@civ-game/shared`.
- Keep debug endpoints off in production (`ENABLE_DEBUG_ENDPOINTS=false`). Respect CORS, rate limits, and input validation middleware.

## Contribution Conventions
- Commits use Conventional Commits, e.g. `feat(server): add city production queue` or `fix(client): prevent hex drag jitter`.
- PRs must follow `.github/pull_request_template.md`:
  - Tests added/updated and passing, lint and typecheck pass, docs updated, link issues with `Closes #123`, screenshots/GIFs for UI, scoped diffs.

## Where To Change Things
- Server game logic: `server/src/game/GameEngine.ts`, map math/generation `server/src/game/HexMap.ts`
- Multiplayer coordination: `server/src/game/GameManager.ts` and websocket handlers in `server/src/websocket/`
- Persistence & Save/Load: `server/src/database/` and `server/src/handlers/saveLoadHandlers.ts`
- API: `server/src/controllers/` (`/api` served at port 3001)
- Client UI: `client/src/components/`, `client/src/pages/`, global state in `client/src/store/`
- Shared types/utils: `shared/src/` (exported via package)

## Agent Workflow Checklist (Do This Every PR)
1) Create a focused branch and plan your changes
2) Implement minimal changes; follow naming/formatting rules; use shared logger
3) Add/adjust tests next to the code you changed
4) Run: lint, typecheck, tests (server/shared, then client)
5) Update docs and run docs tracker: `npm run docs:update && npm run docs:validate`
6) Enable hooks (first time) and commit; ensure pre-commit/pre-push pass
7) Verify dev flow locally: `npm run dev` → open two tabs and sanity-check basic turns if game-related changes
8) Open PR using the template; include screenshots for UI changes

## Quick Local Smoke Test (Game Flow)
- `npm run dev` → server `:3001`, client `:5173`
- Open two tabs at `http://localhost:5173` → Create game in Tab A, Join from Tab B → Start → alternate simple turns for ~10 moves

— Keep diffs tight, tests green, docs current, and secrets out of git.
