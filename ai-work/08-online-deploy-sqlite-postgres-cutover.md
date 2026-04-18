# SQLite-to-Postgres Cutover

## Purpose

This document defines the manual cutover sequence for moving existing local SQLite data into the Postgres runtime introduced by `08-online-deploy`.

## Prerequisites

- The source SQLite database file is present and readable.
- `DATABASE_URL` points at the intended Postgres target.
- The Postgres target is reachable and backed up according to the vendor's normal tooling.
- The application is stopped or otherwise prevented from writing to SQLite during migration.

## Sequence

1. Back up the SQLite source file.
2. Back up or snapshot the Postgres target if it contains any data.
3. Run the Postgres schema bootstrap:

```powershell
npm run db:create -- --mode dev
```

4. Run the one-time copy:

```powershell
npm run db:migrate:sqlite -- --sqlite .data\dev.db
```

5. Review the migration report:

- Every table count must show matching SQLite and Postgres counts.
- Every integrity check must report `broken=0`.
- The final line must report that validation passed.

6. Start the app against the same `DATABASE_URL`.
7. Spot-check the viewer, admin source-channel list, virtual-channel list, and watch history pages.
8. Keep the SQLite backup until the Postgres-backed app has been validated.

## Failure Handling

- If row counts differ or an integrity check fails, stop the cutover and keep the app pointed at the previous known-good data source.
- Fix the cause, restore or reset the Postgres target from backup, and rerun the migration.
- The migration command is idempotent for the same source and target, but a clean restored target is preferred for production cutover investigations.

## SQLite Dependency Removal Gate

Do not remove `better-sqlite3`, SQLite DAOs, or SQLite test fixtures until:

- The one-time migration has been run and validated for the real data set.
- Runtime traffic is confirmed on Postgres.
- No rollback to the SQLite source is required.
fish
