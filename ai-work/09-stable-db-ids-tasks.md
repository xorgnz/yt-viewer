# Tasks: Stable Database IDs

## Relevant Files

- `src/lib/daos/_schema.ts` - Current MySQL/MariaDB schema DDL and indexes.
- `src/lib/daos/*DAO.ts` - DAO methods that currently expose or consume generated row IDs.
- `src/lib/daos/readers/*.ts` - Viewer/history read queries that join across generated row IDs.
- `src/lib/server/**/*.ts` - Services and route-facing code that passes relationship identifiers between DAOs and UI actions.
- `src/lib/youtube/importer.ts` - YouTube import path that creates source channel and video records.
- `scripts/create_database.ts` - Latest-schema bootstrap entry point for local/database setup.
- `scripts/migrate_database.ts` - Existing migration runner, if useful for local verification only.
- `tests/lib/*.test.ts` - DAO, reader, migration, and service tests to update for stable IDs.
- `tests/scripts/database-setup-scripts.test.ts` - Setup/migration script coverage.
- `ai-work/09-stable-db-ids-db-change-plan.md` - Required proposed database change plan for user validation before schema or production DB changes.

## Tasks

- [x] 1 - Audit current generated-ID usage.
  - [x] 1.1. Inventory every table column that is an auto-increment primary key or generated row-id foreign key.
  - [x] 1.2. Trace every DAO, reader, service, route, importer, and test path that passes generated IDs between entities.
  - [x] 1.3. Identify stable identifier needs, join/state-table composite key candidates, and any public/API/UI contracts that expose generated row IDs.

- [ ] 2 - Propose exact database changes for user validation before implementation.
  - [x] 2.1. Draft `ai-work/09-stable-db-ids-db-change-plan.md` with the exact planned table, column, key, index, and foreign key changes.
  - [x] 2.2. Include the proposed stable ID source for each entity, including YouTube-derived IDs, natural-key-derived IDs, and composite-key tables.
  - [x] 2.3. Include the planned production migration sequence and rollback/backup expectations.
  - [x] 2.4. Present the plan to the user and wait for explicit approval before making schema edits, migration scripts, or production database changes.

- [ ] 3 - Update the application schema and setup path after database-change approval.
  - [ ] 3.1. Update `src/lib/daos/_schema.ts` to define the approved stable-ID columns, keys, indexes, and foreign keys, including `src_channel_id`, `video_id`, `vchannel_id`, and `profile_id`.
  - [ ] 3.2. Keep setup idempotent for MySQL/MariaDB local and production-compatible environments.
  - [ ] 3.3. Update setup script tests to match the new schema contract and the rule that serial row IDs remain only for event/bookkeeping tables such as `watch_history` and `migration_history`.

- [ ] 4 - Update write-side DAO and import behavior to use stable IDs.
  - [ ] 4.1. Update source channel, video, profile, virtual channel, assignment, selection, flag, and history writes to persist the approved stable identifiers.
  - [ ] 4.2. Apply approved YouTube-derived, profile-key-derived, opaque virtual-channel, and composite-key ID rules consistently, including retry-on-collision behavior for `vchannel_id`.

- [ ] 5 - Update read-side queries and service contracts to use stable IDs.
  - [ ] 5.1. Update DAO and reader return types where database-generated serial row IDs are currently used as entity or relationship identifiers.
  - [ ] 5.2. Update server services and route actions to pass `src_channel_id`, `video_id`, `vchannel_id`, and `profile_id` through viewer, history, flag, assignment, and selection workflows.
  - [ ] 5.3. Preserve current user-facing behavior while changing only the backing identifier contract and keeping serial IDs private to event/bookkeeping rows.

- [ ] 6 - Build and verify the local/admin migration path.
  - [ ] 6.1. Create an inspectable migration artifact that can be run from this workspace with admin credentials and is not deployed as app startup code.
  - [ ] 6.2. Ensure existing production data can be rewritten deterministically from database-generated serial IDs to stable domain-derived or app-generated IDs while preserving relationships.
  - [ ] 6.3. Verify the migration against local/dev data or a representative export before production use.

- [ ] 7 - Update tests for stable-ID behavior.
  - [ ] 7.1. Update DAO and reader tests to assert stable identifiers, entity-prefixed ID names, and composite keys in SQL and returned records.
  - [ ] 7.2. Update importer tests to prove YouTube-backed records keep stable IDs derived from YouTube IDs and profiles keep IDs derived from existing profile keys.
  - [ ] 7.3. Add migration-focused coverage proving relationships are preserved through the approved rewrite from serial IDs to stable IDs.
  - [ ] 7.4. Update service/route tests for flags, history, assignments, and selected video review state while keeping serial IDs private to event/bookkeeping rows.

- [ ] 8 - Run validation and production readiness checks.
  - [ ] 8.1. Run `npm run check`, `npm run typecheck`, and `npm run test`.
  - [ ] 8.2. Confirm no code path depends on database-generated serial row IDs as entity identities or relationship identifiers, except for approved private event/bookkeeping rows.
  - [ ] 8.3. Prepare the production migration execution notes and post-migration smoke-check list, including runtime credential expectations.
