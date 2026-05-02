# Project Overview

## Purpose

`yt-viewer` is a SvelteKit application for importing YouTube channel uploads, organizing them into curated virtual channels, and giving users a focused viewer for browsing, filtering, and watching the resulting library with per-profile state.

The product has two primary surfaces:

- a viewer experience for browsing videos, watching videos, tracking history, and managing per-profile flags
- an admin experience for importing source channels, maintaining virtual channels, and controlling how source-channel content appears in those virtual channels

## Current System Summary

The current system stores imported YouTube source channels and videos in a MySQL/MariaDB database, then exposes those videos through both direct source-channel browsing and curated virtual-channel views. Virtual channels are built by associating source channels with a virtual channel and controlling inclusion behavior through assignment modes and, for selected-only cases, per-video review state.

Viewer workflows support search, filtering, profile-specific watched/favorite/ignored flags, session-style watch history, and recommendation/next-video flows. Admin workflows support channel import and refresh, virtual-channel CRUD, inline assignment management, and deeper per-channel review controls for selected-only curation.

The repository has already completed the initial product build, history tracking, migration infrastructure, multi-select viewer actions, refactoring, and online deployment work. The current active direction is `10-timers`, which adds optional daily playback caps for virtual channels using persisted watch-history data as the accounting source. A paused but still-important architectural thread is `09-stable-db-ids`, which aims to remove brittle cross-table dependence on generated serial row IDs.

## Key Features

- Viewer library and watch flow
  - browse videos with filters, pagination, and virtual-channel context
  - watch videos with adjacent navigation and per-profile flags
- Watch history and profile state
  - record session-style watch progress independently from watched flags
  - keep watched, favorite, and ignored state per active profile
- Virtual channel curation
  - group source channels into viewer-facing virtual channels
  - control assignment behavior through `all`, `long_only`, and `selected_only` modes
- Admin channel management
  - import, refresh, create, rename, and delete source and virtual channels
  - review selected-only video inclusion state
- Explicit schema and migration workflow
  - keep latest-schema bootstrap in code
  - use forward-only migrations for database evolution

## Architecture Overview

### Tech Stack

- Frontend: SvelteKit + Svelte + plain CSS/Sass support
- Backend: SvelteKit server routes and server-side service classes
- Data/storage: MySQL/MariaDB via `mysql2`
- Testing: Vitest
- Tooling/infrastructure: Vite, TypeScript, Docker Compose for local DB, Cloud Run for deployment

### System Shape

The application is organized around thin SvelteKit routes, explicit server-side services, and direct SQL DAOs/read repositories.

- Route modules parse request input, resolve request context, and delegate to services.
- `src/lib/server/admin/` and `src/lib/server/viewer/` contain request-facing business logic.
- `src/lib/daos/` contains write-side DAOs, read repositories, query specs, and migration/bootstrap support.
- `src/lib/entities/` contains entity classes and plain field-value types shared across the app.
- `src/lib/viewer/` contains client-side viewer state, selection logic, and presentation helpers.
- `src/lib/youtube/` handles YouTube API fetch/import logic and mapping into stored records.

The current data model centers on:

- `source_channels`
- `videos`
- `virtual_channels`
- `virtual_channel_assignments`
- `virtual_channel_assignment_video_selections`
- `profiles`
- `video_flags`
- `watch_history`
- `migration_history` and `_meta`

Current schema version in code is `9` in `src/lib/daos/_schema.ts`.

## Directory Guide

### Top-Level Layout

- `ai-work/` - planning artifacts, feature status, project summary docs, and feature-specific scope/PRD/task files
- `ai-rules/` - repository workflow rules for planning, execution, testing, and commit preparation
- `src/` - primary application implementation root
  - `src/routes/` - SvelteKit pages, layouts, and form actions for viewer, history, profile switching, and admin surfaces
  - `src/lib/server/` - request-scoped service layer and shared server context helpers
  - `src/lib/daos/` - schema DDL, migrations, DAOs, query specs, and read repositories
  - `src/lib/entities/` - entity classes and plain field-value structures
  - `src/lib/viewer/` - client-side viewer state, selection, bulk actions, and UI helpers
  - `src/lib/components/` - shared Svelte UI components
  - `src/lib/youtube/` - YouTube integration and import mapping
  - `src/lib/auth/` - auth-related helpers
- `scripts/` - database setup/migration and local runtime helper scripts
- `tests/` - Vitest coverage for routes, DAOs, migration/setup code, and shared logic
- `docker-compose.yml` - local MariaDB runtime

### Key Files

- `ai-work/00-feature-status.md` - source of truth for active/planned/future feature state
- `ai-work/00-master-techstack.md` - shared application-wide tech stack decisions
- `src/lib/daos/_schema.ts` - latest-schema DDL and index definitions
- `src/lib/daos/migrations/registry.ts` - registered forward migrations
- `src/lib/server/ServerDatabaseContext.ts` - DB connection lifecycle and runtime mode resolution
- `src/lib/server/ServerProfileContext.ts` - active profile resolution
- `src/routes/viewer/+page.server.ts` - main viewer page load path
- `src/routes/viewer/watch/[videoId]/+page.server.ts` - watch-page server actions for history and watched-state updates
- `src/routes/admin/virtual-channels/+page.server.ts` - virtual-channel admin index actions
- `package.json` - scripts and package-level tooling entry points

## Current Work

- `10-timers` is the active feature.
- Current implemented groundwork covers:
  - optional virtual-channel timer persistence in schema/entity/DAO code
  - initial watch-history aggregate query support for timer accounting
- Remaining timer work includes:
  - timezone/day-window definition
  - UI management for timer settings
  - playback enforcement and disabled-state behavior in viewer surfaces
  - targeted tests

## Future Work

- Resume and complete `09-stable-db-ids` to remove dependence on generated serial row IDs across relationships.
- `xx-rec-modes` - recommendation-mode controls for content selection/prioritization.
- `xx-shorts-mgmt` - Shorts detection, overrides, and Shorts-aware filtering.
- `xx-channel-mgmt` - broader channel management and review tooling.
- `xx-video-channels` - virtual channels built from arbitrary video lists instead of whole source channels.
