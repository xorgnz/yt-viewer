## Relevant Files

- `src/lib/daos/_schema.ts` - Database schema DDL and schema version for channels, videos, groups, profiles, flags, and watch history.
- `src/lib/daos/shared/DatabaseWrapper.ts` - Opens an existing SQLite database and centralizes connection handling.
- `src/lib/daos/shared/SqliteDAO.ts` - Base DAO utilities for SQLite access used by concrete DAOs.
- `src/lib/daos/assignmentDAO.ts` - DAO for channel-to-group assignments.
- `src/lib/daos/channelDAO.ts` - DAO for channels.
- `src/lib/daos/channelGroupDAO.ts` - DAO for channel groups.
- `src/lib/daos/flagsDAO.ts` - DAO for video/profile flags.
- `src/lib/daos/historyDAO.ts` - DAO for watch history entries.
- `src/lib/daos/profileDAO.ts` - DAO for profiles.
- `src/lib/daos/videoDAO.ts` - DAO for videos.
- `scripts/create_database.ts` - CLI to create and initialize a fresh database per mode.
- `scripts/migrate_database.ts` - CLI to apply database migrations.
- `src/lib/youtube/youTubeClient.ts` - YouTube API client wrapper for channel and video import.
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
- `src/routes/viewer/+server.ts` - Server data for the watch grid.
- `src/routes/viewer/watch/[videoId]/+page.svelte` - Embedded playback view.
- `src/routes/viewer/watch/[videoId]/+server.ts` - Watch events and flag updates.
- `src/lib/watch/criteria.ts` - Watch-completion calculation logic.
- `src/routes/history/+page.svelte` - Watch history list with filters.
- `src/routes/history/+server.ts` - History query and filtering.
- `src/lib/profiles.ts` - Hard-coded profile definitions and preferences.
- `src/lib/auth/admin.ts` - Hard-coded admin password guard.
- `src/lib/state/videoFlags.ts` - Flag update helpers.
- `src/app.css` - Shared styles for viewer and admin UIs.

### Notes

- Unit tests should typically be placed alongside the code files they are testing.
- Consult `/ai-work/00-master-techstack.md` for the shared stack and testing/tooling choices.
- Use Windows-compatible, non-interactive commands in this repository, consistent with `AGENTS.md`.
- Avoid long-running commands such as development servers unless the user explicitly requests them.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [x] 0.0 Create feature workspace
  - [x] 0.1 Set up the initial working context for this feature
  - [x] 0.2 Create the Node project and install required modules
  - [x] 0.3 Set up the initial Svelte and TypeScript project files
- [x] 1.0 Define data model and local persistence for channels, videos, flags, profiles, and history
  - [x] 1.1 Design schema for channels, channel groups, group assignments, videos, profiles, flags, and watch history
  - [x] 1.2 Define indices and constraints for unique channel IDs, video IDs, and per-profile flags
  - [x] 1.3 Implement SQLite connection helpers and a migrations strategy
  - [x] 1.4 Add data-access helpers for CRUD operations needed by admin and viewer flows
- [x] 2.0 Build admin management for channels and channel groups
  - [x] 2.1 Implement the hard-coded admin password guard and admin navigation layout
  - [x] 2.2 Build channel CRUD UI and server actions
  - [x] 2.3 Build channel group CRUD UI and server actions
  - [x] 2.4 Build channel-to-group assignment UI and server actions
- [x] 3.0 Implement YouTube import and manual refresh workflow
  - [x] 3.1 Implement YouTube API client configuration and request helpers
  - [x] 3.2 Fetch channel metadata and the full video list with pagination
  - [x] 3.3 Map API responses into local video records and upsert them into the database
  - [x] 3.4 Add a manual refresh action in the admin UI and server handler
  - [x] 3.5 Handle basic API error states such as invalid channel ID, quota issues, and network failures
- [x] 4.0 Build the viewer experience
  - [x] 4.1 Implement watch-grid query filters for term, date range, watched status, and channel or group
  - [x] 4.2 Build the viewer UI to render the grid and filter controls
  - [x] 4.3 Implement the embedded playback view
  - [x] 4.4 Add ignore and favorite flag toggles from the viewer UI
  - [x] 4.5 Implement watch-completion detection and update watched state and history
- [x] 5.0 Add history log view and profile-specific UI preferences
  - [x] 5.1 Implement watch history queries with filters for profile, channel, and date
  - [x] 5.2 Build the history list UI with filters
  - [x] 5.3 Add the profile selector and apply profile-specific preferences
