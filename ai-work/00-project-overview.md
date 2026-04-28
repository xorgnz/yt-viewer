# Project Overview

## Purpose

`yt-viewer` is a SvelteKit web application for importing YouTube channel uploads, organizing them into curated "virtual channels", and browsing or watching the resulting video library with per-profile state.

The app has two main surfaces:

- Viewer-facing pages for filtering videos, watching videos, switching profiles, and reviewing watch history.
- Admin-facing pages for managing source channels, virtual channels, imports, and virtual-channel assignment behavior.

## Current Project State

- Active feature: `09-stable-db-ids`
- Active branch target: `feature/09-stable-db-ids`
- Planning status: feature 09 audit is complete; schema and application changes are still pending.
- Completed feature history:
  - `01-initial`: initial viewer, admin CRUD, import flow, history, profile support
  - `02-vchannel-mgmt`: virtual-channel/source-channel associations and selected-only review model
  - `03-inline-assign`: inline source-channel assignment controls on admin index
  - `04-watch-history`: session-based watch history separate from watched flags
  - `05-db-migrations`: forward-only migration infrastructure
  - `06-video-select`: viewer multi-select, bulk actions, undo
  - `07-refactoring`: service-layer and repository decomposition
  - `08-online-deploy`: MySQL/MariaDB runtime, local Docker Compose DB, Cloud Run deployment

## Product Model

The core data model in the current codebase is:

- `source_channels`: imported YouTube channels
- `videos`: imported channel videos
- `virtual_channels`: curated groups shown to viewers
- `virtual_channel_assignments`: relationship between a source channel and a virtual channel, with mode
- `virtual_channel_assignment_video_selections`: per-video review state for `selected_only` assignments
- `profiles`: site profiles used for viewer-specific state
- `video_flags`: per-profile `ignored`, `watched`, and `favorite` flags
- `watch_history`: session-style watch tracking
- `migration_history` and `_meta`: schema versioning and migration metadata

Current schema version in code: `8` in [src/lib/daos/_schema.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/daos/_schema.ts).

## Behavior Summary

### Viewer

- Main viewer page supports search, channel filters, date filters, watched/ignored filters, pagination, and virtual-channel filtering.
- Viewer selection supports single-select, additive/range multi-select, bulk flag updates, and undo.
- Watch page tracks playback history sessions independently from the watched flag.
- History page supports session view and aggregated per-video view.

Primary entry points:

- [src/routes/viewer/+page.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/viewer/+page.server.ts)
- [src/routes/viewer/+page.svelte](/abs/path/D:/workspaces/yt-viewer/src/routes/viewer/+page.svelte)
- [src/routes/viewer/watch/[videoId]/+page.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/viewer/watch/[videoId]/+page.server.ts)
- [src/routes/history/+page.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/history/+page.server.ts)

### Admin

- Source-channel admin supports create, update, delete, lookup/import, and refresh.
- Virtual-channel index supports create, rename, delete, inline add/remove assignment, and navigation to manage pages.
- Virtual-channel manage page supports assignment mode changes and selected-only review-state updates, including bulk update of filtered results.
- Admin routes are gated by cookie-based session checks.

Primary entry points:

- [src/routes/admin/+layout.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/admin/+layout.server.ts)
- [src/routes/admin/source-channels/+page.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/admin/source-channels/+page.server.ts)
- [src/routes/admin/virtual-channels/+page.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/admin/virtual-channels/+page.server.ts)
- [src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts](/abs/path/D:/workspaces/yt-viewer/src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts)

## Architecture Summary

The repository is structured around thin SvelteKit routes and explicit service/DAO layers.

- Routes parse request inputs and delegate to services.
- `src/lib/server/*` contains request-scoped service logic.
- `src/lib/daos/*` contains write-side DAOs, read repositories, query specs, and migration/bootstrap support.
- `src/lib/entities/*` holds shared entity and contract types.
- `src/lib/viewer/*` holds client-side viewer state, selection logic, and UI helpers.
- `src/lib/youtube/*` wraps YouTube fetch and import mapping.

Important infrastructure files:

- [src/lib/server/ServerDatabaseContext.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/server/ServerDatabaseContext.ts): runtime DB connection lifecycle and mode resolution
- [src/lib/server/ServerProfileContext.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/server/ServerProfileContext.ts): active profile resolution
- [src/lib/server/ServerAdminSession.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/server/ServerAdminSession.ts): admin auth/session guard
- [src/lib/server/ServerActionForm.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/server/ServerActionForm.ts): form parsing helpers

## Project Layout

### Planning and workflow

- `ai-work/`: planning artifacts, feature docs, task breakdowns, tech stack, and status tracking
- `ai-rules/`: repository-specific workflow rules for feature planning and execution
- `AGENTS.md`: repository operating instructions

### Application code

- `src/routes/`: SvelteKit routes
  - `admin/`: admin UI and auth routes
  - `viewer/`: main viewer, watch page, and virtual-channel routes
  - `history/`: watch-history UI
  - `profile/+server.ts`: active-profile switching
- `src/lib/components/`: shared UI components
- `src/lib/viewer/`: viewer UI helpers, selection state, bulk actions, page state
- `src/lib/server/admin/`: admin service layer
- `src/lib/server/viewer/`: viewer service layer
- `src/lib/daos/`: persistence layer
  - `shared/`: DB pool, bootstrap, migration engine
  - `migrations/`: registered forward migrations
  - `queries/`: SQL query-spec builders
  - `readers/`: read-model repositories
- `src/lib/entities/`: shared domain types
- `src/lib/youtube/`: YouTube client, fetch, mapping, and import services
- `src/lib/auth/`: password policy helpers

### Operational code

- `scripts/create_database.ts`: latest-schema bootstrap for an existing MySQL/MariaDB database
- `scripts/migrate_database.ts`: explicit forward-only migration command for `dev` and `live`
- `scripts/run_with_local_mysql.ts`: wraps a command with the local Docker Compose database URL
- `docker-compose.yml`: local MariaDB runtime
- `deploy.ps1`: Windows deployment flow for Cloud Run
- `deploy.sh`: shell deployment variant

### Tests

- `tests/admin/`: admin route/auth coverage
- `tests/lib/`: viewer, DAO, migration, runtime, and parsing coverage
- `tests/scripts/`: DB setup script coverage
- `tests/helpers/`: shared test utilities

## Runtime and Stack

- Framework: SvelteKit
- Language: TypeScript
- Runtime adapter: `@sveltejs/adapter-node`
- Database: MySQL/MariaDB via `mysql2`
- Local DB runtime: Docker Compose
- Deployment target: Google Cloud Run
- Testing: Vitest

Package and script definitions live in [package.json](/abs/path/D:/workspaces/yt-viewer/package.json).

## Important Current Constraints

- The codebase still uses generated integer row IDs as primary relational identifiers.
- Feature `09-stable-db-ids` exists to replace those brittle generated IDs with stable identifiers and adjusted foreign-key contracts.
- Planning for feature 09 is spread across:
  - [ai-work/09-stable-db-ids-prd.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-prd.md)
  - [ai-work/09-stable-db-ids-scope.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-scope.md)
  - [ai-work/09-stable-db-ids-tasks.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-tasks.md)
  - [ai-work/09-stable-db-ids-generated-id-trace.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-generated-id-trace.md)
  - [ai-work/09-stable-db-ids-db-change-plan.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-db-change-plan.md)

## Resume Guidance

When starting a new session, review these first:

1. [ai-work/00-feature-status.md](/abs/path/D:/workspaces/yt-viewer/ai-work/00-feature-status.md)
2. [ai-work/00-master-techstack.md](/abs/path/D:/workspaces/yt-viewer/ai-work/00-master-techstack.md)
3. [ai-work/09-stable-db-ids-tasks.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-tasks.md)
4. [ai-work/09-stable-db-ids-db-change-plan.md](/abs/path/D:/workspaces/yt-viewer/ai-work/09-stable-db-ids-db-change-plan.md)

Then inspect the current implementation around:

- [src/lib/daos/_schema.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/daos/_schema.ts)
- [src/lib/daos/queries/ViewerVideoQuerySpec.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/daos/queries/ViewerVideoQuerySpec.ts)
- [src/lib/daos/readers/HistoryReadRepository.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/daos/readers/HistoryReadRepository.ts)
- [src/lib/server/admin/AdminVirtualChannelManageService.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/server/admin/AdminVirtualChannelManageService.ts)
- [src/lib/server/viewer/ViewerWatchService.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/server/viewer/ViewerWatchService.ts)
- [src/lib/youtube/importer.ts](/abs/path/D:/workspaces/yt-viewer/src/lib/youtube/importer.ts)
