# Master Technology Stack: YouTube Viewer & Tracker

**Created:** 2026-02-17
**Status:** Approved baseline + shared updates through `08-online-deploy`

## Overview

This document is the shared application-wide source of truth for the stack used by the YouTube Viewer & Tracker project. It captures the baseline technologies already chosen for the app and identifies which feature first required them.

## Technology Decisions

### Frontend Framework
- **Choice:** SvelteKit
- **Rationale:** The project is already structured as a SvelteKit application and uses its routing and server capabilities for a single-stack web app.
- **Version:** `@sveltejs/kit` `^2.50.0`
- **First Required By:** `01-initial`

### UI Component Library
- **Choice:** Svelte Material UI
- **Rationale:** Provides a ready-made component set for the initial admin and viewer interfaces.
- **Version:** `svelte-material-ui` `latest`
- **First Required By:** `01-initial`

### Backend Framework
- **Choice:** SvelteKit server routes
- **Rationale:** Keeps server endpoints in the same application and avoids introducing a second backend framework for V1.
- **Version:** Included with SvelteKit
- **First Required By:** `01-initial`

### Runtime Deployment Adapter
- **Choice:** `@sveltejs/adapter-node`
- **Rationale:** Produces a Node server build that runs directly in Cloud Run via `node build`.
- **Version:** `@sveltejs/adapter-node` `^7.0.0`
- **First Required By:** `08-online-deploy`

### Deployment Platform
- **Choice:** Google Cloud Run (buildpacks flow with staged `deploy/`)
- **Rationale:** Keeps deployment simple while supporting managed runtime, scaling, and secret injection.
- **Version:** Managed GCP service
- **First Required By:** `08-online-deploy`

### Secrets Management
- **Choice:** Google Cloud Secret Manager with `DATABASE_URL` as the primary DB secret contract
- **Rationale:** Centralizes production secret handling and keeps credentials out of source control.
- **Version:** Managed GCP service
- **First Required By:** `08-online-deploy`

### Database
- **Choice:** PostgreSQL for both local and production environments
- **Rationale:** Provides one durable database technology across environments and avoids Cloud Run SQLite limitations.
- **Version:** Vendor-managed in production; Docker Compose-managed locally
- **First Required By:** `08-online-deploy`

### Database Access
- **Choice:** Direct SQL helpers against PostgreSQL
- **Rationale:** Preserves the current explicit SQL style while migrating storage from SQLite to Postgres.
- **Version:** Postgres client dependency selected during `08-online-deploy` implementation
- **First Required By:** `08-online-deploy`

### Local Database Runtime
- **Choice:** Docker Compose-managed PostgreSQL service
- **Rationale:** Creates a reproducible local environment and keeps database lifecycle bundled with app setup.
- **Version:** Docker Compose stack in repository
- **First Required By:** `08-online-deploy`

### YouTube Integration
- **Choice:** Direct REST calls via `fetch`
- **Rationale:** The project only needs straightforward public API access and does not require an additional SDK.
- **Version:** Browser/server runtime built-in
- **First Required By:** `01-initial`

### State Management
- **Choice:** Svelte stores
- **Rationale:** Lightweight built-in state management is sufficient for filters, profile state, and flag updates.
- **Version:** Included with Svelte
- **First Required By:** `01-initial`

### Styling
- **Choice:** Plain CSS, Svelte scoped styles, and Sass support
- **Rationale:** The current project already includes Sass and can use a mix of scoped component styling and shared styles without adding another styling framework.
- **Version:** `sass` `^1.77.0`
- **First Required By:** `01-initial`

### Testing
- **Choice:** Vitest
- **Rationale:** Fits the Vite/SvelteKit toolchain and supports targeted local test execution.
- **Version:** `vitest` `latest`
- **First Required By:** `01-initial`

### Type Checking
- **Choice:** TypeScript with `svelte-check`
- **Rationale:** Provides compile-time validation for both shared TypeScript modules and Svelte components.
- **Version:** `typescript` `^5.9.0`, `svelte-check` `^4.3.0`
- **First Required By:** `01-initial`

### Build Tool
- **Choice:** Vite
- **Rationale:** Standard build tooling for the current SvelteKit setup.
- **Version:** `vite` `^7.3.1`
- **First Required By:** `01-initial`

### Package Manager
- **Choice:** npm
- **Rationale:** Matches the existing lockfile and project scripts.
- **Version:** Lockfile-managed
- **First Required By:** `01-initial`

## Development Environment

- **Node Version:** 20.x
- **Package Manager:** npm
- **Operating Environment:** Windows shell environment per `AGENTS.md`
- **Local Database Runtime:** Docker Compose
- **IDE/Editor:** Not specified

## Dependencies

### Core Dependencies
```json
{
  "pg": "latest",
  "svelte-material-ui": "latest"
}
```

### Development Dependencies
```json
{
  "@sveltejs/adapter-node": "^7.0.0",
  "@sveltejs/kit": "^2.50.0",
  "@sveltejs/vite-plugin-svelte": "^6.2.0",
  "@types/node": "^25.2.3",
  "@types/pg": "latest",
  "sass": "^1.77.0",
  "svelte": "^5.50.0",
  "svelte-check": "^4.3.0",
  "tsx": "^4.21.0",
  "typescript": "^5.9.0",
  "vite": "^7.3.1",
  "vitest": "latest"
}
```

## Architecture Notes

- Use SvelteKit routes and server handlers for admin CRUD, import workflows, viewer queries, and history endpoints.
- Keep schema and migration logic explicit in the repository.
- Complete a full SQLite-to-Postgres migration in `08-online-deploy`, including local development runtime alignment.
- Keep local and production database behavior aligned through one Postgres-backed data model.
- Use Docker Compose locally for Postgres lifecycle and Cloud Run + Secret Manager in production.
- Implement watch-completion logic in shared helpers so viewer behavior is consistent.
- Treat this document as the baseline stack for future features and update it only when a feature introduces a new shared technology decision.

## Future Considerations

- Introduce e2e coverage if the viewer and admin flows become more complex.
- Reassess the UI component strategy if Svelte Material UI becomes limiting.
- Consider a more formal migration or data-access layer if persistence logic grows substantially.
