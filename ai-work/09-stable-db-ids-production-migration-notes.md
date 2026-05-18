# Stable ID Production Migration Notes

## Purpose

This note records the production execution procedure for the stable-ID rewrite, the runtime credential expectations, the post-migration smoke checks, and the final validation summary for task 8.

## Validation Summary

- `npm run check` passed.
- `npm run typecheck` passed.
- `npm run test` passed.

## Application Contract Confirmation

The application code no longer depends on generated database row IDs as entity identities or cross-table relationship identifiers.

Confirmed application-side stable-ID usage:

- `source_channels` relationships use `src_channel_id`.
- `videos` relationships use `video_id` and `src_channel_id`.
- `profiles` relationships use `profile_id`.
- `virtual_channels` relationships use `vchannel_id`.
- `virtual_channel_assignments` use the stable pair `src_channel_id + vchannel_id`.
- `virtual_channel_assignment_video_selections` use the stable tuple `src_channel_id + vchannel_id + video_id`.
- `video_flags` use the stable pair `video_id + profile_id`.
- `watch_history` relationships use stable `video_id + profile_id`.

Approved private generated-row-ID usage that remains:

- `watch_history.id` remains a private session row key used only after the stable `video_id + profile_id` session lookup has already resolved the session row to update.
- `migration_history.id` remains private migration bookkeeping.

Allowed legacy-column references that still appear intentionally:

- `scripts/migrate_stable_ids.ts` reads the legacy schema in order to rewrite it into the stable-ID schema.
- Historical planning and audit documents under `ai-work/` describe the old row-ID model for traceability.

## Runtime Credential Expectations

- Run the migration only from a trusted admin shell in this workspace.
- `DATABASE_URL` must point at the target MySQL/MariaDB database.
- The database user must be allowed to:
  - create tables
  - rename tables
  - create indexes
  - create foreign keys
  - insert, update, and delete rows
  - read `information_schema.columns`
  - read `information_schema.tables`
- The operator must have a verified production backup before using `--apply`.

## Production Execution Sequence

1. Confirm the deployment artifact contains the stable-ID application code and tests already validated in this workspace.
2. Take a production backup and verify it can be restored.
3. Record pre-migration row counts for:
   - `source_channels`
   - `videos`
   - `virtual_channels`
   - `virtual_channel_assignments`
   - `virtual_channel_assignment_video_selections`
   - `profiles`
   - `video_flags`
   - `watch_history`
4. Set `DATABASE_URL` to the production database.
5. Run a dry run first:

```powershell
npx tsx scripts/migrate_stable_ids.ts live
```

6. Review the reported rewrite plan and confirm the expected legacy tables are detected.
7. Run the rewrite only after the dry-run output is acceptable:

```powershell
npx tsx scripts/migrate_stable_ids.ts live --apply
```

8. Confirm the script completes without foreign-key or row-count validation failures.
9. Preserve the `legacy_*` tables until post-migration verification is complete.

## Post-Migration Smoke Checks

Database-level checks:

- Row counts match between the pre-migration snapshot and the new live tables.
- Every expected live table exists with stable-ID primary keys and foreign keys.
- `_meta` contains the stable-ID migration markers.
- `legacy_*` backup tables exist after the swap.

Application smoke checks:

- Viewer page loads.
- Viewer filtering by source channel works.
- Viewer filtering by virtual channel works.
- Watch page loads for a known video.
- Watch progress updates still succeed.
- Watch-history session creation still succeeds.
- History page loads and shows known sessions.
- Favorite, watched, and ignored toggles still persist.
- Admin source-channel refresh still imports/upserts against YouTube-derived IDs.
- Admin virtual-channel assignment add/remove still works.
- Selected-only review state still persists for assignment/video pairs.
- Virtual-channel timer behavior still resolves against the selected stable `vchannel_id`.

## Rollback Position

- The rewrite preserves `legacy_*` tables specifically so rollback can be performed from the pre-swap data if post-migration verification fails.
- If rollback is required, stop application writes first, restore from the verified backup or rename the preserved `legacy_*` tables back into place, and then rerun smoke checks before reopening traffic.
