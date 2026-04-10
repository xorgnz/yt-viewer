## Relevant Files

- `scripts/create_database.ts` - Fresh database creation path that should remain the latest-schema bootstrap for disposable environments and tests.
- `scripts/migrate_database.ts` - Command entrypoint that should become the explicit forward-only migration workflow for `dev` and `live`.
- `src/lib/daos/schemaVersionDAO.ts` - Existing schema metadata helper that will likely need expansion for richer migration tracking.
- `src/lib/daos/_schema.ts` - Current latest-schema DDL source that should remain the fresh-create baseline rather than the upgrade mechanism.
- `src/lib/daos/shared/DatabaseWrapper.ts` - Database open path that may need guardrails to avoid silent auto-migration during normal startup.
- `src/lib/daos/` - Likely home for shared migration abstractions, adapter contracts, and migration definitions.
- `src/lib/daos/shared/` - Likely home for a migration runner, backup helpers, and engine adapter interfaces.
- `src/lib/daos/migrations/` - Expected location for forward-only migration definitions and migration registry files.
- `tests/` - Target area for migration, backup/restore, refusal, and fresh-create test coverage.
- `tests/lib/` - Likely place for migration-runner and metadata tests that do not depend on route behavior.
- `tests/scripts/` - Likely place for CLI-oriented migration workflow tests if script behavior is exercised directly.

### Notes

- Unit tests should typically be placed alongside the code files they are testing.
- Consult `/ai-work/00-master-techstack.md` for the approved shared stack and tooling choices.
- Use Windows-compatible, non-interactive commands in this repository, consistent with `AGENTS.md`.
- Avoid long-running commands such as development servers unless explicitly requested.
- `test` databases are intentionally disposable in this feature and should continue using fresh-create flows rather than in-place migrations.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [ ] 1.0 Define the forward-only migration architecture, metadata model, and adapter boundary for user-data databases
  - [x] 1.1 Define the migration model, including version, name, ordering, execution contract, and latest-only upgrade behavior
  - [ ] 1.2 Define the migration metadata storage shape so applied migrations record at least version, name, applied timestamp, and success-related state
  - [ ] 1.3 Design an engine-adapter boundary so top-level migration flow does not depend directly on SQLite-only concepts
  - [ ] 1.4 Establish conventions for where future migration files live and how schema-changing features register new migrations
  - [ ] 1.5 Define supported versus unsupported source-state handling so unknown or ambiguous databases fail clearly

- [ ] 2.0 Implement the explicit migration command workflow for `dev` and `live`, including latest-only upgrade behavior
  - [ ] 2.1 Add shared migration runner code that discovers the current state and applies pending migrations in order
  - [ ] 2.2 Refactor `scripts/migrate_database.ts` into a true forward-only upgrade command for `dev` and `live`
  - [ ] 2.3 Ensure the migration command always targets the latest supported version rather than accepting arbitrary version targets
  - [ ] 2.4 Add migration definition registration and loading for the first supported forward-looking migration set
  - [ ] 2.5 Ensure command output clearly reports detected version, applied migrations, and final version state

- [ ] 3.0 Add backup, failure recovery, and unknown-state refusal behavior to the migration flow
  - [ ] 3.1 Add automatic pre-migration backup creation for `dev` and `live` databases
  - [ ] 3.2 Restore the original database automatically when a migration attempt fails after backup creation
  - [ ] 3.3 Preserve a copy of the failed partially migrated database when practical for later inspection
  - [ ] 3.4 Refuse to proceed when the database state is unknown, unsupported, or inconsistent with expected migration metadata
  - [ ] 3.5 Make failure and recovery output explicit so the operator can locate the restored database, backup, and any failed-state artifact

- [ ] 4.0 Preserve fresh-create behavior for `test` and other disposable database workflows while separating it cleanly from migrations
  - [ ] 4.1 Keep `scripts/create_database.ts` focused on fresh latest-schema creation rather than upgrade logic
  - [ ] 4.2 Ensure `test` database workflows continue starting from scratch and do not depend on in-place migrations
  - [ ] 4.3 Separate latest-schema bootstrap responsibilities from migration responsibilities in shared database utilities
  - [ ] 4.4 Add guardrails so normal database open paths do not silently trigger migrations during application startup
  - [ ] 4.5 Update any developer-facing usage expectations in code comments or helper output so fresh-create versus migrate workflows are unambiguous

- [ ] 5.0 Add focused automated test coverage for migration execution, refusal paths, and recovery behavior
  - [ ] 5.1 Add tests for fresh database creation at the latest schema for disposable environments
  - [ ] 5.2 Add tests for successful forward migration of a supported prior database state to the latest version
  - [ ] 5.3 Add tests covering migration metadata recording, including applied version, name, and timestamp behavior
  - [ ] 5.4 Add tests covering refusal on unknown or unsupported database states
  - [ ] 5.5 Add tests for backup creation, failure-triggered restore, and retention of failed-state artifacts when practical
