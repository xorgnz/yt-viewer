## Relevant Files

- `src/lib/daos/_schema.ts` - Database schema DDL and schema version for channels, videos, groups, profiles, flags, and watch history.
- `src/lib/daos/shared/DatabaseWrapper.ts` - Opens an existing SQLite database (no creation/migrations).
- `src/lib/daos/shared/SqliteDAO.ts` - Base DAO utilities for SQLite access used by concrete DAOs.
- `src/lib/daos/assignmentDAO.ts` - DAO for channel-to-group assignments.
- `src/lib/daos/channelDAO.ts` - DAO for channels.
- `src/lib/daos/channelGroupDAO.ts` - DAO for channel groups.
- `src/lib/daos/flagsDAO.ts` - DAO for video/profile flags.
- `src/lib/daos/historyDAO.ts` - DAO for watch history entries.
- `src/lib/daos/profileDAO.ts` - DAO for profiles.
- `src/lib/daos/videoDAO.ts` - DAO for videos.
- `scripts/create_database.ts` - CLI to create and initialize a fresh database per mode (test/dev/live).
- `src/lib/youtube/youTubeClient.ts` - YouTube API client wrapper for channel/video import.
- `src/lib/youtube/mapper.ts` - Mapping from API responses to local models.
- `src/routes/admin/+layout.svelte` - Admin layout with protected navigation.
- `src/routes/admin/+page.svelte` - Admin landing view.
- `src/routes/admin/channels/+page.svelte` - Channel CRUD UI.
- `src/routes/admin/channels/+server.ts` - Channel CRUD actions.
- `src/routes/admin/channel-groups/+page.svelte` - Channel group CRUD UI.
- `src/routes/admin/channel-groups/+server.ts` - Channel group CRUD actions.
- `src/routes/admin/assignments/+page.svelte` - Assign channels to groups.
- `src/routes/admin/assignments/+server.ts` - Assignment actions.
- `src/routes/viewer/+page.svelte` - Watch grid, filters, and video selection.
- `src/routes/viewer/+server.ts` - Server data for watch grid.
- `src/routes/viewer/watch/[videoId]/+page.svelte` - Embedded playback view.
- `src/routes/viewer/watch/[videoId]/+server.ts` - Watch events and flag updates.
- `src/lib/watch/criteria.ts` - Watch-completion calculation logic.
- `src/routes/history/+page.svelte` - Watch history list with filters.
- `src/routes/history/+server.ts` - History query and filtering.
- `src/lib/profiles.ts` - Hard-coded profile definitions and preferences.
- `src/lib/auth/admin.ts` - Hard-coded admin password guard.
- `src/lib/state/videoFlags.ts` - Flag update helpers.
- `src/app.css` - Shared styles for viewer/admin UIs.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Testing uses Vitest. Common commands:
  - `npm run test` to run the full test suite once (CI mode).
  - `npm run test:watch` to run tests in watch mode during development.
  - Alternatively, `npx vitest run [optional/path/to/test/file]` to run a specific file or subset.
- All commands must be run in WSL Bash. Never use PowerShell, Windows CMD, or `wsl`/`bash -lc` bridging.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/01-initial`)
  - [x] 0.2 Create node project and import required modules
  - [x] 0.3 Set up initial project files for Svelte and TypeScript
- [x] 1.0 Define data model and local persistence for channels, videos, flags, profiles, and history
  - [x] 1.1 Design schema for channels, channel groups, group assignments, videos, profiles, flags, and watch history
  - [x] 1.2 Define indices/constraints for unique channel IDs, video IDs, and per-profile flags
  - [x] 1.3 Implement SQLite client/connection helpers and migrations strategy
  - [x] 1.4 Add data access helpers for CRUD operations needed by admin and viewer flows
- [x] 2.0 Build admin management for channels and channel groups (CRUD + assignment)
  - [x] 2.1 Implement hard-coded admin password guard and admin navigation layout
  - [x] 2.2 Build channel CRUD UI and server actions (add, edit, delete, list)
  - [x] 2.3 Build channel group CRUD UI and server actions
  - [x] 2.4 Build channel-to-group assignment UI and server actions
- [x] 3.0 Implement YouTube import + manual refresh workflow
  - [x] 3.1 Implement YouTube API client configuration and request helpers
  - [x] 3.2 Fetch channel metadata and full video list (with pagination)
  - [x] 3.3 Map API responses into local video records and upsert into DB
  - [x] 3.4 Add manual “Refresh” action in admin UI and server handler
  - [x] 3.5 Handle basic API error states (invalid channel ID, quota, network)
- [ ] 4.0 Build viewer experience (watch grid, filters, playback, flags, watched tracking)
  - [x] 4.1 Implement watch grid query filters (term, date range, watched status, channel/group)
  - [x] 4.2 Build viewer UI to render grid and filter controls
  - [x] 4.3 Implement embedded playback view with selected video
  - [x] 4.4 Add ignore/favorite flag toggles from viewer UI
  - [ ] 4.5 Implement watch completion detection and update watched flag + history
- [ ] 5.0 Add history log view and profile-specific UI preferences
  - [ ] 5.1 Implement watch history query with filters (profile/channel/date)
  - [ ] 5.2 Build history list UI with filters
  - [ ] 5.3 Add profile selector and apply profile-specific preferences