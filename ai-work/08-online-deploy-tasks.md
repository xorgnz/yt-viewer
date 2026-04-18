## Relevant Files

- `package.json` - Dependency and script updates for `@sveltejs/adapter-node`, `pg`, and Postgres-focused local workflows.
- `svelte.config.js` - SvelteKit adapter switch to `adapter-node`.
- `src/lib/server/database/context.ts` - Request-scoped database context entrypoint that must resolve Postgres runtime connections.
- `src/lib/daos/shared/` - Shared persistence infrastructure currently tied to SQLite that needs a Postgres implementation path.
- `src/lib/daos/*.ts` - DAO modules that currently run SQLite SQL and must run against Postgres.
- `src/lib/daos/migrations/` - Migration registry and migration units that must support Postgres schema evolution.
- `scripts/create_database.ts` - Database bootstrap flow to align with Postgres local/prod behavior.
- `scripts/migrate_database.ts` - Migration runner entrypoint for Postgres.
- `deploy.ps1` - Windows deployment flow for Cloud Run, Secret Manager wiring, and startup smoke test.
- `deploy.sh` - Unix deployment flow matching the Windows deployment behavior.
- `docker-compose.yml` - Local Postgres service definition for reproducible local runtime.
- `.env.sample` - Environment contract updates for local Postgres and deployment settings.
- `tests/helpers/` - Database harness updates to support Postgres-backed test setup.
- `tests/lib/*.test.ts` - DAO, migration, and server-context tests affected by the persistence migration.
- `tests/viewer/`, `tests/admin/`, `tests/history-route.test.ts`, `tests/layout-route.test.ts` - Route-level regression coverage for full app behavior on Postgres.

### Notes

- Feature completion target is full Postgres operation in both local and production environments.
- Keep local runtime containerized with Docker Compose and avoid requiring host-level Postgres setup.
- Preserve existing user-facing behavior while replacing persistence and deployment plumbing.
- Use `DATABASE_URL` as the primary configuration contract across local and production.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [x] 1.0 Switch runtime and shared dependencies to the Cloud Run + Postgres baseline
  - [x] 1.1 Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node` and update `svelte.config.js` for Node server output.
  - [x] 1.2 Add Postgres runtime dependencies (`pg` and required typings) while retaining SQLite bindings temporarily for migration tooling.
  - [x] 1.3 Update npm scripts so production startup and DB lifecycle scripts align with `node build` and Postgres migration/bootstrap execution.
  - [x] 1.4 Update configuration loading to require `DATABASE_URL` for server-side runtime paths used by app requests and scripts.

- [x] 2.0 Implement Postgres persistence infrastructure and migration execution
  - [x] 2.1 Introduce a shared Postgres connection/pool wrapper to replace SQLite file-based wrapper assumptions.
  - [x] 2.2 Port schema bootstrap and forward migration execution from SQLite adapters to Postgres-compatible SQL and transaction handling.
  - [x] 2.3 Update migration registry and migration helpers so new migrations run correctly against Postgres in local and production environments.
  - [x] 2.4 Update database setup scripts to create or validate Postgres schema state without SQLite file operations.

- [ ] 3.0 Migrate data-access and server flows from SQLite bindings to Postgres
  - [x] 3.1 Refactor shared DAO base utilities to use Postgres parameter binding and result mapping conventions.
  - [x] 3.2 Update all DAO modules and query/read-repository modules to run against Postgres while preserving current behavior and return shapes.
  - [ ] 3.3 Update request database-context wiring in route/server helpers so all route workflows run on Postgres-backed connections.
  - [ ] 3.4 Isolate remaining SQLite-only code paths to migration-only tooling and remove SQLite usage from the main runtime code paths.

- [ ] 3.5 Implement and validate SQLite-to-Postgres data migration execution
  - [ ] 3.5.1 Build a one-time migration tool that reads existing SQLite data and writes equivalent Postgres records with deterministic ordering and idempotency guards.
  - [ ] 3.5.2 Add validation checks/reports for migrated row counts and key relational integrity before cutover.
  - [ ] 3.5.3 Define and document the cutover sequence (backup, migrate, verify, switch runtime) for local and production workflows.
  - [ ] 3.5.4 Remove SQLite bindings/dependencies only after migration validation passes and Postgres-only runtime is confirmed.

- [ ] 4.0 Add Docker Compose local runtime for full-system Postgres development
  - [ ] 4.1 Add `docker-compose.yml` with a Postgres service, persistent volume, healthcheck, and explicit port mapping for local development.
  - [ ] 4.2 Define local environment defaults (`DATABASE_URL`, credentials, port mapping) in `.env.sample` and local docs comments as needed.
  - [ ] 4.3 Ensure app startup, migration scripts, and tests can target the Compose-managed Postgres instance predictably.
  - [ ] 4.4 Add guardrails to avoid accidental fallback to SQLite when local Postgres is unavailable.

- [ ] 5.0 Update Cloud Run deployment scripts and secret wiring for Postgres production runtime
  - [ ] 5.1 Update `deploy.ps1` to stage Node build output, run smoke startup checks, and deploy with `DATABASE_URL` sourced from Secret Manager.
  - [ ] 5.2 Update `deploy.sh` to mirror the same staging, smoke-test, and `gcloud run deploy --update-secrets` behavior.
  - [ ] 5.3 Remove or replace unrelated legacy deploy secret wiring so deploy scripts only set variables required for this app runtime.
  - [ ] 5.4 Verify Cloud Run deploy arguments enforce `HOST=0.0.0.0`, runtime port compatibility, and expected buildpacks start behavior.

- [ ] 6.0 Rebuild automated coverage around Postgres-backed execution and deployment-critical paths
  - [ ] 6.1 Update test harnesses/fixtures to run against Postgres-compatible setup and migration flows.
  - [ ] 6.2 Update DAO and migration tests to assert Postgres SQL behavior, schema versioning, and forward-only migration guarantees.
  - [ ] 6.3 Run and fix route-level regression tests for viewer, admin, history, and layout paths against the migrated persistence layer.
  - [ ] 6.4 Run project validation (`npm run check`, `npm run test`) and resolve remaining typing, import, and runtime issues before closing the feature.
