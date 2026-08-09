# Tasks: 12-resume-video-position

## Relevant Files

- `src/lib/daos/_schema.ts` - Latest schema definition for the `watch_history` table.
- `src/lib/daos/migration/migrations/` - Forward migration location for persisted playback position.
- `src/lib/daos/migration/migrations/registry.ts` - Migration registration.
- `src/lib/entities/watchHistory.ts` - Watch-history entity and field-value shape.
- `src/lib/daos/historyDAO.ts` - Watch-history persistence, latest-session lookup, and timer aggregate queries.
- `src/lib/server/viewer/ViewerWatchService.ts` - Viewer watch-page orchestration and load payload.
- `src/routes/viewer/watch/[videoId]/+page.server.ts` - Watch-page action parsing and service calls.
- `src/routes/viewer/watch/[videoId]/+page.svelte` - YouTube player position capture and one-time resume seek.
- `tests/lib/migration-runner.test.ts` - Migration coverage.
- `tests/scripts/database-setup-scripts.test.ts` - Fresh-schema setup coverage.
- `tests/lib/viewer-timer-services.test.ts` - Viewer service and timer behavior coverage.
- `tests/viewer/viewer-watch-route.test.ts` - Route action parsing and load behavior coverage.

## Tasks

- [x] 1 - Add playback-position storage to watch history
  - [x] 1.1 - Add nullable `last_position_seconds` to the latest `watch_history` schema.
  - [x] 1.2 - Add and register a forward migration for existing databases.
  - [x] 1.3 - Extend the watch-history entity field shape with the new persisted position.
  - [x] 1.4 - Update `HistoryDAO` create, update, and row-mapping paths to read and write the position without changing timer aggregate queries.

- [ ] 2 - Surface a valid resume position from the viewer service
  - [ ] 2.1 - Keep the active-session timer baseline logic based on the existing session age rules.
  - [ ] 2.2 - Derive `resumePositionSeconds` separately from the latest profile-specific watch-history session for the current video.
  - [ ] 2.3 - Suppress resume data when the video is already marked watched.
  - [ ] 2.4 - Ignore resume positions that are missing, non-positive, non-finite, or beyond the known video duration.

- [ ] 3 - Pass playback position through watch-page actions
  - [ ] 3.1 - Parse a playback-position form value independently from `watchSeconds`.
  - [ ] 3.2 - Pass the parsed position into create-session and update-progress service calls.
  - [ ] 3.3 - Treat invalid or missing position values as absent so existing history requests continue to work.

- [ ] 4 - Resume playback in the Svelte watch page
  - [ ] 4.1 - Include `player.getCurrentTime()` in create, update, and flush history requests.
  - [ ] 4.2 - Seek once to the server-provided resume position when the YouTube player is ready.
  - [ ] 4.3 - Reset the one-time seek guard when route-driven video changes load a different video.
  - [ ] 4.4 - Preserve the existing timer, watched-threshold, and pending-flush behavior.

- [ ] 5 - Validate the feature
  - [ ] 5.1 - Add or update migration tests for upgraded databases and fresh schema setup.
  - [ ] 5.2 - Add service coverage for stored position, watched-video suppression, and invalid-position filtering.
  - [ ] 5.3 - Add route coverage for playback-position form parsing.
  - [ ] 5.4 - Run targeted tests and the existing Svelte/TypeScript check command that fits this change.
