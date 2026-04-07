## Relevant Files

- `src/lib/daos/_schema.ts` - Watch-history schema definition that must be replaced with the new session-oriented columns.
- `src/lib/entities/watchHistory.ts` - Watch-history entity type that must reflect the new persisted fields.
- `src/lib/daos/historyDAO.ts` - Watch-history persistence and query logic for session creation, updates, and history page views.
- `src/routes/viewer/watch/[videoId]/+page.server.ts` - Watch-page actions that currently couple watched toggles and history inserts.
- `src/routes/viewer/watch/[videoId]/+page.svelte` - Watch-page client logic that will need elapsed-watch-time tracking and periodic history updates.
- `src/routes/history/+page.server.ts` - History page loader that must support both session view and per-video view.
- `src/routes/history/+page.svelte` - History page UI that must expose the richer history data and inline help.
- `src/lib/daos/videoDAO.ts` - Viewer queries that may need review to ensure watched-flag behavior remains independent from history.
- `tests/viewer/` - Viewer route or behavior tests for watch-session creation, updating, and watched-flag separation.
- `tests/lib/` - DAO-level tests for the new watch-history schema and query behavior.

### Notes

- Unit tests should typically be placed alongside the code files they are testing.
- Consult `/ai-work/00-master-techstack.md` for the approved shared stack and tooling choices.
- Use Windows-compatible, non-interactive commands in this repository, consistent with `AGENTS.md`.
- Avoid long-running commands such as development servers unless explicitly requested.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [x] 1.0 Redesign the watch-history data model and persistence around session-based watch tracking
  - [x] 1.1 Replace the current `watch_history` schema with session-oriented fields for session start, last update, and accumulated time watched
  - [x] 1.2 Update the watch-history entity and DAO contracts to match the new persisted shape
  - [x] 1.3 Add DAO support for finding the most recent session for a video/profile, creating a new session after the threshold, and incrementally updating an existing session
  - [x] 1.4 Add DAO query support for both chronological session history and per-video summary history views
  - [x] 1.5 Ensure the schema change discards legacy watch-history rows as agreed for this feature
- [ ] 2.0 Update watch-page playback logic to create and extend watch-history sessions independently from watched-flag changes
  - [x] 2.1 Track elapsed watch time on the client based on active playback rather than furthest playback position reached
  - [x] 2.2 Create a watch-history session only after more than 5 seconds of accumulated watch time
  - [x] 2.3 Periodically persist active session watch time at roughly 10-second intervals while playback continues
  - [ ] 2.4 Reuse the most recent session when the last persisted update is within 5 minutes, and start a fresh session after longer gaps
  - [ ] 2.5 Keep repeated viewing and rewatches counting toward accumulated time watched
- [ ] 3.0 Refactor watched-flag actions so manual watched toggles are decoupled from watch-history recording
  - [ ] 3.1 Remove history creation side effects from the manual watched/unwatched action
  - [ ] 3.2 Preserve the existing automatic watched-threshold behavior on the watch page
  - [ ] 3.3 Add or adjust server endpoints/actions needed for lightweight history-session create/update requests separate from watched toggles
  - [ ] 3.4 Verify that watched filtering elsewhere in the viewer still depends only on `video_flags.watched`
- [ ] 4.0 Expand the history page to support session view, per-video view, and inline help for the new logic
  - [ ] 4.1 Add a mode switch for chronological session view versus per-video summary view
  - [ ] 4.2 Update the session view to show video title, source channel name, session start, last updated time, and accumulated watch time
  - [ ] 4.3 Add the per-video summary view with expandable underlying sessions
  - [ ] 4.4 Add inline expandable help explaining the 5-second threshold, 10-second updates, 5-minute session split rule, watch-time semantics, and watched-flag separation
  - [ ] 4.5 Keep existing filtering and pagination behavior working across the updated history views where practical
- [ ] 5.0 Validate the new watch-history behavior with targeted automated tests and checks
  - [ ] 5.1 Add DAO-level tests for session creation, reuse within 5 minutes, split after 5 minutes, and accumulated time updates
  - [ ] 5.2 Add route or action tests covering separation of manual watched toggles from history-session writes
  - [ ] 5.3 Add history page load tests for both chronological session data and per-video summary data
  - [ ] 5.4 Run targeted automated checks for the updated history and watch flows without starting long-running processes
