## Relevant Files

- `package.json` - Dependency and script updates for `@sveltejs/adapter-node`, database client dependencies, and database-focused local workflows.
- `svelte.config.js` - SvelteKit adapter switch to `adapter-node`.
- `src/lib/server/database/context.ts` - Request-scoped database context entrypoint that must resolve production runtime connections.
- `src/lib/daos/shared/` - Shared persistence infrastructure for the MySQL/MariaDB runtime path.
- `src/lib/daos/*.ts` - DAO modules that must run against the target production database.
- `src/lib/daos/migrations/` - Migration registry and migration units that must support target database schema evolution.
- `scripts/create_database.ts` - Database bootstrap flow to align with local/prod behavior.
- `scripts/migrate_database.ts` - Migration runner entrypoint for the target database.
- `deploy.ps1` - Windows deployment flow for Cloud Run, Secret Manager wiring, and startup smoke test.
- `deploy.sh` - Unix deployment flow matching the Windows deployment behavior.
- `docker-compose.yml` - Local database service definition for reproducible local runtime.
- `.env.sample` - Environment contract updates for local database and deployment settings.
- `tests/helpers/` - Database harness updates to support target database-backed test setup.
- `tests/lib/*.test.ts` - DAO, migration, and server-context tests affected by the persistence migration.
- `tests/viewer/`, `tests/admin/`, `tests/history-route.test.ts`, `tests/layout-route.test.ts` - Route-level regression coverage for full app behavior on the target database.

### Notes

- Feature completion target is full MySQL/MariaDB operation in both local and production environments.
- Keep local runtime containerized with Docker Compose and avoid requiring host-level Postgres setup.
- Preserve existing user-facing behavior while replacing persistence and deployment plumbing.
- Use `DATABASE_URL` as the primary configuration contract across local and production.
- MySQL/MariaDB is the only supported runtime database path after production cutover.

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

- [x] 3.0 Migrate data-access and server flows from SQLite bindings to Postgres
  - [x] 3.1 Refactor shared DAO base utilities to use Postgres parameter binding and result mapping conventions.
  - [x] 3.2 Update all DAO modules and query/read-repository modules to run against Postgres while preserving current behavior and return shapes.
  - [x] 3.3 Update request database-context wiring in route/server helpers so all route workflows run on Postgres-backed connections.
  - [x] 3.4 Isolate remaining SQLite-only code paths to migration-only tooling and remove SQLite usage from the main runtime code paths.

- [ ] 3.5 Implement and validate SQLite-to-Postgres data migration execution
  - [x] 3.5.1 Build a one-time migration tool that reads existing SQLite data and writes equivalent Postgres records with deterministic ordering and idempotency guards.
  - [x] 3.5.2 Add validation checks/reports for migrated row counts and key relational integrity before cutover.
  - [x] 3.5.3 Define and document the cutover sequence (backup, migrate, verify, switch runtime) for local and production workflows.
  - [ ] 3.5.4 Remove SQLite bindings/dependencies only after migration validation passes and Postgres-only runtime is confirmed.

- [x] 4.0 Add Docker Compose local runtime for full-system Postgres development
  - [x] 4.1 Add `docker-compose.yml` with a Postgres service, persistent volume, healthcheck, and explicit port mapping for local development.
  - [x] 4.2 Define local environment defaults (`DATABASE_URL`, credentials, port mapping) in `.env.sample` and local docs comments as needed.
  - [x] 4.3 Ensure app startup, migration scripts, and tests can target the Compose-managed Postgres instance predictably.
  - [x] 4.4 Add guardrails to avoid accidental fallback to SQLite when local Postgres is unavailable.

- [x] 5.0 Update Cloud Run deployment scripts and secret wiring for Postgres production runtime
  - [x] 5.1 Update `deploy.ps1` to stage Node build output, run smoke startup checks, and deploy with `DATABASE_URL` sourced from Secret Manager.
  - [x] 5.2 Update `deploy.sh` to mirror the same staging, smoke-test, and `gcloud run deploy --update-secrets` behavior.
  - [x] 5.3 Remove or replace unrelated legacy deploy secret wiring so deploy scripts only set variables required for this app runtime.
  - [x] 5.4 Verify Cloud Run deploy arguments enforce `HOST=0.0.0.0`, runtime port compatibility, and expected buildpacks start behavior.

- [x] 6.0 Switch production persistence target from Postgres to InMotion MySQL/MariaDB
  - [x] 6.1 Replace Postgres runtime dependencies and wrappers with a MySQL/MariaDB client layer using `mysql2` or an equivalent maintained Node driver.
  - [x] 6.2 Port schema bootstrap, migration registry, and forward migration execution from Postgres SQL to MySQL/MariaDB-compatible DDL and transactions.
  - [x] 6.3 Port DAO modules and read repositories from Postgres placeholders/result mapping to MySQL/MariaDB conventions while preserving return shapes.
  - [x] 6.4 Update server database-context wiring, runtime URL handling, and local command wrappers so app requests target MySQL/MariaDB.
  - [x] 6.5 Replace Docker Compose Postgres local runtime with MySQL/MariaDB-compatible local runtime and update `.env.sample` defaults.
  - [x] 6.6 Replace SQLite-to-Postgres migration tooling with SQLite-to-MySQL/MariaDB migration tooling, including deterministic ordering, idempotency guards, row-count reports, and integrity checks.
  - [x] 6.7 Update Cloud Run deployment scripts and user setup notes to name the MySQL/MariaDB `DATABASE_URL` secret contract and InMotion connection assumptions.

- [x] 7.0 Remove obsolete Postgres implementation and validate MySQL/MariaDB runtime
  - [x] 7.1 Remove Postgres-specific wrappers, adapters, tests, scripts, dependency entries, and documentation once MySQL/MariaDB runtime coverage passes.
  - [x] 7.2 Update test harnesses/fixtures to run against MySQL/MariaDB-compatible setup and migration flows.
  - [x] 7.3 Update DAO and migration tests to assert MySQL/MariaDB SQL behavior, schema versioning, and forward-only migration guarantees.
  - [x] 7.4 Run and fix route-level regression tests for viewer, admin, history, and layout paths against the MySQL/MariaDB persistence layer.
  - [x] 7.5 Run project validation (`npm run check`, `npm run test`) and resolve remaining typing, import, dependency, and runtime issues before closing the feature.

- [ ] 8.0 Remove remaining SQLite-era implementation, tooling, and artifacts after production cutover
  - [x] 8.1 Remove one-time SQLite-to-MySQL migration commands, scripts, and tests now that production data has been imported.
  - [x] 8.2 Remove SQLite-only shared infrastructure, including file-layout, wrapper, DAO base, migration workflow, and SQLite migration adapter modules that no runtime or test path still needs.
  - [x] 8.3 Replace remaining SQLite-backed route, DAO, service, and YouTube importer tests with MySQL-compatible harnesses or focused unit fakes.
  - [x] 8.4 Remove obsolete SQLite dependencies and type packages from `package.json` and `package-lock.json`.
  - [x] 8.5 Remove local generated SQLite/export artifacts such as `.data/` and `build/` from the working tree after confirming they are not needed for rollback.
  - [x] 8.6 Update docs, task notes, and environment examples so MySQL/MariaDB is the only supported runtime database path.
  - [ ] 8.7 Run full validation (`npm run check`, `npm run typecheck`, `npm run test`) and fix any fallout from removing SQLite.
