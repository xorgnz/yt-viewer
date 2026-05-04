# Draft PRD: Forward-Only Database Migrations

## 1. Introduction/Overview

This feature adds a forward-only migration system for persisted application data so an existing deployment can be upgraded to the latest supported design without manually re-entering content. The migration workflow is intended for the repository's user-data databases and should support both schema changes and explicit data transformations.

The first implementation will run on top of SQLite because that is the current database engine, but the migration design should not be tightly coupled to SQLite-specific concepts. The system should establish portable migration interfaces and workflow conventions so a future database engine change does not force a full redesign of migration behavior.

## 2. Goals

1. Provide a forward-only migration workflow for `dev` and `live` databases.
2. Support both schema evolution and deterministic data transformation steps.
3. Require explicit migration execution rather than silent automatic migration during normal app startup.
4. Create automatic backups before user-data migrations and restore safely on failure.
5. Define migration abstractions that can support engine-specific adapters beneath a shared migration model.
6. Ensure unknown or unsupported database states fail clearly rather than being guessed at or reset automatically.

## 3. User Stories

- As the app operator, I want an existing local deployment upgraded to the latest supported schema without manually rebuilding my data.
- As the app operator, I want migrations to run only when I explicitly command them, so normal app startup does not perform surprising persistence changes.
- As the app operator, I want automatic backups before migration so I have a safe recovery path if an upgrade fails.
- As the app operator, I want failed migrations restored from backup automatically, so a bad migration does not leave my main database unusable.
- As a developer, I want migrations to support data reshaping as well as schema changes, so future model evolution does not force destructive resets.
- As a developer, I want migration logic organized behind an adapter boundary, so the workflow can survive a future move away from SQLite.
- As a developer, I want `test` databases to continue starting from the latest schema, so tests remain isolated and fast rather than depending on historical upgrade chains.
- As a developer, I want the tool to target only the latest supported version, so maintenance and verification stay focused on one upgrade destination.

## 4. Functional Requirements

1. The system must provide a forward-only migration command for upgrading persisted application databases.
2. The migration command must apply all pending migrations in order until the latest supported version is reached.
3. The migration command must not support arbitrary downgrade flows.
4. The migration command must not require the user to specify a target version; the only supported destination is the latest version known to the application.
5. Migration support in this feature must apply to `dev` and `live` databases.
6. `test` databases must continue to be created fresh from the latest schema and must not rely on in-place migration execution.
7. The migration system must support schema-only migrations and migrations that include deterministic data transformation steps.
8. The migration system must track applied migration metadata, including at least migration version, migration name, and applied timestamp.
9. The migration system should also record enough status information to determine whether a migration attempt completed successfully.
10. The migration system must detect the current database migration state before applying pending migrations.
11. If the database state is unknown, ambiguous, or unsupported, the migration command must refuse to proceed with a clear error.
12. The system must not silently guess how to migrate an unknown database state.
13. The migration command must create an automatic backup before mutating a `dev` or `live` database.
14. If a migration fails after backup creation, the system must restore the main database from the backup automatically.
15. If practical, the system should preserve a copy of the failed partially migrated database for inspection when a migration attempt fails.
16. The migration system must provide an abstraction boundary so engine-specific behavior can be implemented through adapters rather than hard-coded into top-level migration flow.
17. The migration definition model must be portable enough that future database-engine work can reuse the migration workflow concepts without full redesign.
18. The current application must not automatically run migrations during ordinary database open or app startup flows in this feature.
19. The migration workflow must be deterministic and traceable enough to support focused automated testing.
20. The feature must define conventions for how future schema-changing work contributes new migrations.
21. The feature may focus on the migration framework and future-ready workflow rather than retrofitting broad support for every historical development database ever produced by the repository.
22. The feature should assume a single live deployment model for now and does not need to solve fleet-wide coordinated rollout concerns.

## 5. Non-Goals

- Supporting downgrade migrations
- Migrating `test` databases in place
- Automatically running migrations during standard application startup
- Silently resetting incompatible databases as a fallback
- Adding broad compatibility support for every ad hoc historical development schema ever created during earlier feature work
- Replacing SQLite as the active database engine in this feature
- Building multi-deployment orchestration, distributed rollout coordination, or hosted migration management

## 6. Design Considerations

- Migration commands should be explicit, operator-readable, and conservative in failure behavior.
- Backup and restore behavior should be obvious from command output so the operator understands what happened.
- Migration metadata should make it easy to inspect which migrations have been applied and when.
- The migration API should separate migration intent from engine-specific execution details.
- Failure messages should be specific enough to support manual investigation with developer assistance.
- Because the project currently targets a single live deployment, the workflow can optimize for clarity and safety over fleet-scale operational complexity.

## 7. Technical Considerations

- The current repository already has schema version metadata support in `_meta`, which can be extended rather than replaced outright.
- The current `create_database` and `migrate_database` scripts need to be separated cleanly into fresh-create versus forward-upgrade responsibilities.
- The latest-schema bootstrap path should remain available for `test` databases and disposable environments.
- Migration execution will likely still use SQLite-specific SQL and backup mechanics internally at first, but those details should sit behind an adapter layer.
- Table-rebuild migrations may still be required for some schema changes under SQLite, so data-copy and transform steps must be first-class migration operations.
- Backup and restore behavior should be designed so failed migrations do not leave the primary `dev` or `live` database stranded in an unusable intermediate state.
- Automated tests should cover fresh-create behavior, successful migration to latest, refusal on unknown state, backup creation, and failure recovery.

## 8. Success Metrics

- A `dev` or `live` database from a supported prior deployment can be upgraded to the latest version without manual data re-entry.
- Migration execution only occurs when explicitly commanded.
- Successful migration runs leave the database at the latest supported version with recorded metadata.
- Failed migration runs restore the primary database from backup automatically.
- `test` workflows continue using fresh databases rather than relying on migration history.
- New schema-changing work has a clear, repeatable place to add migrations.
- The top-level migration workflow remains adaptable enough that a future engine change would not require discarding the migration model.

## 9. Clarifications Applied

- Migrations are forward-only and always target the latest supported version.
- Migration execution should be explicit and command-driven rather than automatic during normal app startup.
- Migration support in this feature applies to `dev` and `live`, while `test` continues to start from scratch.
- Automatic backups are required for `dev` and `live` before migration begins.
- On migration failure, the system should restore the backup automatically and keep a copy of the failed partially migrated database when practical.
- The migration framework must support both schema changes and data transformations.
- The top-level design should use an abstraction layer with engine-specific adapters beneath it.
- The project currently assumes a single live deployment, so the workflow does not need multi-instance coordination in this phase.
- This feature is primarily forward-looking and should focus on establishing migration infrastructure rather than exhaustively rescuing every historical local database state.

## 10. Open Questions

- What exact migration metadata schema best balances useful audit detail with a simple local-first implementation?
- Which known prior deployment states should be treated as officially supported upgrade sources in the first migration release?
- What level of inspection output is desired from the migration command for backup, restore, and failed-state artifact paths?
