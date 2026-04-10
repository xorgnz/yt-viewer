# Database Migration Architecture

## Purpose

This note defines the forward-only migration model for feature `05-db-migrations`.

It currently covers task `1.1`:

- migration identity
- ordering behavior
- execution contract
- latest-only upgrade behavior

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
