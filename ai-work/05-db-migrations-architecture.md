# Database Migration Architecture

## Purpose

This note defines the forward-only migration model for feature `05-db-migrations`.

It currently covers task `1.1`:

- migration identity
- ordering behavior
- execution contract
- latest-only upgrade behavior
- migration metadata storage shape
- engine-adapter boundary
- file and registration conventions
- supported-source-state policy

Metadata storage shape, engine adapters, and registration conventions are defined separately by later tasks in this feature.

## Migration Unit

Each migration is a single forward-only upgrade step with a stable identity:

- `version`: integer schema target reached after the migration succeeds
- `name`: short stable slug used in logs and migration metadata
- `apply`: deterministic execution function for the upgrade step

The migration version is the post-migration schema version, not the source version. A migration from schema `7` to schema `8` is therefore registered as version `8`.

## Ordering Rules

Migrations are ordered strictly by ascending `version`.

Rules:

- each registered migration must have a unique `version`
- versions must increase by whole-number steps without duplicates
- migration order is derived from `version`, not file name or registration order
- the runner must reject duplicate or out-of-order definitions during startup or command preparation

This keeps the execution path deterministic even if the registration list is assembled from multiple files later.

## Execution Contract

Each migration must be written so it can be executed exactly once as part of a forward-only sequence.

Contract:

- input state: the database is at the immediately preceding supported version
- output state: the database is fully upgraded to the migration's declared `version`
- execution is synchronous from the runner's point of view
- failure is terminal for the migration run and must surface as an error
- partial success inside one migration is not considered acceptable completion
- a migration may include schema changes, data backfills, or both

The runner owns orchestration. Individual migrations should only express the changes needed to move from the prior supported version to their declared target version.

## Latest-Only Upgrade Behavior

The migration command does not accept an arbitrary target version.

Behavior:

- the only valid destination is the highest registered migration version
- when the current database is already at that version, the runner reports that no migration is needed
- when the current version is lower and supported, the runner applies every pending migration in ascending order until the highest registered version is reached
- when the current version is unknown, higher than supported, or otherwise ambiguous, the runner refuses to proceed

This keeps the operational workflow narrow: one source-state check, one ordered upgrade path, and one supported destination.

## Migration Metadata Storage Shape

Migration tracking should move beyond a single `schema_version` key and record applied migration history explicitly.

The design keeps two metadata layers:

- a current-state record for quick version detection
- an append-only migration history record for auditability

### Current State Record

The current schema version remains readable without scanning full history.

Required fields:

- `current_version`: integer latest successfully applied schema version
- `updated_at`: timestamp for when the current-state record was last changed

This may continue to live in `_meta` or a replacement metadata table, but the runner should treat it as derived from successful migration completion, not as an independent source of truth that can advance ahead of history.

### Applied Migration History

Each successful or attempted migration should have a durable metadata record.

Required fields:

- `version`: integer target version declared by the migration
- `name`: stable migration slug
- `applied_at`: timestamp written when the migration attempt finishes successfully
- `success`: boolean-like status flag for whether the migration completed successfully

Recommended additional fields for traceability:

- `started_at`: timestamp for when the migration attempt began
- `error_message`: nullable short failure summary when `success` is false

### Recording Rules

Metadata behavior:

- a successful migration writes a history row with its `version`, `name`, `applied_at`, and `success = true`
- the current-state record advances only after the migration completes successfully
- a failed migration attempt may write a failure record when practical, but it must not advance the current version
- the runner must reject states where the current version and successful history entries disagree

This shape supports both operator-readable history and strict refusal behavior for inconsistent databases.

## Engine-Adapter Boundary

Top-level migration flow should depend on a migration adapter interface, not on `better-sqlite3` APIs directly.

The boundary separates two layers:

- runner layer: decides whether migration is needed, validates metadata, orders migrations, and reports progress
- adapter layer: performs engine-specific reads, writes, transactions, and backup operations

### Runner Responsibilities

The runner owns engine-agnostic policy:

- inspect current migration state through adapter calls
- validate whether the source state is supported
- choose pending migrations based on registered versions
- execute migrations in order
- update metadata only through adapter methods
- stop on first failure and surface a clear result

The runner must not call SQLite-specific methods such as `pragma`, `prepare`, `exec`, or `transaction` directly.

### Adapter Responsibilities

The adapter owns engine-specific mechanics:

- open migration-capable connections
- read current version and migration metadata
- run schema or data mutation statements inside a safe transactional unit when supported
- write migration success or failure metadata
- create backups and restore from backups when required by later tasks

For SQLite, the first adapter implementation will wrap `better-sqlite3` and hide direct SQL driver operations behind these responsibilities.

### Migration Definition Boundary

Each migration should receive an engine-neutral execution context from the adapter layer rather than a raw SQLite database handle.

That context should expose only the operations needed for migration work, such as:

- execute statements
- query rows or scalar values
- run a transactional block

This keeps individual migrations aligned with the shared migration workflow even if the underlying database engine changes later.

### Intent of the Boundary

This boundary does not try to make all existing DAOs database-agnostic in this feature.

It is narrower:

- application DAOs may remain SQLite-specific for now
- migration orchestration and migration definitions should be isolated behind a portable contract

That keeps task `1.3` focused on the migration system itself instead of forcing a broad repository-wide data-access rewrite.

## File and Registration Conventions

Future migration work should live in dedicated migration-focused modules rather than being mixed into `_schema.ts` or the existing application DAOs.

### Planned Locations

Use these repository locations:

- `src/lib/daos/migrations/` for migration definition files and the migration registry
- `src/lib/daos/shared/` for engine-neutral runner code and engine-specific adapter implementations
- `scripts/migrate_database.ts` as the explicit command entrypoint that invokes the runner
- `scripts/create_database.ts` as the fresh-create path that applies the latest schema directly without replaying migrations

### Migration Definition Files

Each migration should be defined in its own file under `src/lib/daos/migrations/`.

Convention:

- file name begins with the target version for stable discovery by humans
- file exports one migration definition
- file contents describe only the step needed to reach that target version

Example naming pattern:

- `src/lib/daos/migrations/v0008_add_migration_history.ts`
- `src/lib/daos/migrations/v0009_split_profile_flags.ts`

The runner should still order by declared migration `version`, not by file name.

### Registry Convention

`src/lib/daos/migrations/` should include a single registry module that exports the full ordered migration set for the application.

Rules:

- new migrations are added to the registry explicitly
- the registry is the source of truth for supported upgrade targets
- registration should fail fast on duplicate versions or invalid ordering

This keeps migration availability explicit and reviewable in code review.

### Future Feature Contribution Rule

When a future feature changes persisted schema or requires a deterministic data rewrite:

- add a new migration file for the next schema version
- register it in the migration registry
- update the latest schema bootstrap in `_schema.ts` so fresh-create remains current
- add or update tests for both fresh-create and migration behavior when relevant

This avoids a split-brain design where fresh-create and migration history drift apart.

## Supported Source-State Policy

The migration runner must classify the database state before it attempts any upgrade work.

### Supported States

A database is considered supported for migration only when all of the following are true:

- the current version can be determined reliably
- that version is lower than or equal to the highest registered migration version
- the version corresponds to a known supported starting point in the registry
- migration metadata, if present, is internally consistent

In the initial implementation, supported source states should be intentionally narrow and explicit. The runner should prefer a short allowlist of known upgradeable versions over broad guesswork.

### Unsupported States

The runner must refuse to proceed when any of these conditions are true:

- no trustworthy current version can be determined
- the database claims a version newer than the application supports
- migration history contains duplicate successful versions
- migration history names or versions disagree with the registered migration set
- the current-state record disagrees with the highest successful applied migration
- required metadata tables are partially present in a way that prevents reliable interpretation
- the database appears to be an ad hoc historical development state that was never declared upgradeable

### Ambiguous States

An ambiguous state is any state where multiple interpretations are plausible and the runner cannot prove which one is correct.

Examples:

- schema objects imply one version while metadata claims another
- migration metadata exists but is incomplete in a way that cannot be distinguished from partial manual edits
- the database contains some, but not all, artifacts of a migration attempt without a reliable success marker

Ambiguous states must be treated as unsupported, not as best-effort upgrade candidates.

### Refusal Behavior

When the state is unsupported or ambiguous:

- do not run any migration steps
- do not rewrite metadata to "fix" the state automatically
- do not fall back to destructive reset behavior
- return a clear error describing why the state was refused

This policy is intentionally conservative. It protects user data by requiring migration eligibility to be provable rather than assumed.
