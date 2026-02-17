# Technology Stack: YouTube Viewer & Tracker (V1)

**Created:** 2026-02-17
**Status:** Approved

## Overview

This project is a SvelteKit web app for curated YouTube viewing and tracking. It requires local persistence, admin management, embedded playback, and watch history, with a lightweight stack suitable for a personal, local-first workflow.

## Technology Decisions

### Frontend Framework
- **Choice:** SvelteKit + Svelte Material UI (SMUI)
- **Rationale:** SvelteKit is required and provides routing + server endpoints; SMUI accelerates UI work for admin and viewer pages.
- **Version:** Latest stable

### Backend Framework
- **Choice:** SvelteKit server routes
- **Rationale:** Keeps a single stack and reduces operational complexity for V1.
- **Version:** Latest stable

### Database
- **Choice:** SQLite
- **Rationale:** Local, file-based persistence that matches the project constraints.
- **Version:** Latest stable

### DB Access
- **Choice:** Better-sqlite3 with raw SQL
- **Rationale:** Minimal dependencies and full control for a small, local-first app.
- **Version:** Latest stable

### YouTube API Client
- **Choice:** Direct REST via `fetch`
- **Rationale:** Lightweight, minimal dependency footprint for simple API usage.

### State Management
- **Choice:** Svelte stores
- **Rationale:** Native, lightweight state for filters, profiles, and flags.

### Styling
- **Choice:** Plain CSS + Svelte scoped styles
- **Rationale:** Simple, minimal setup without extra tooling.

### Testing
- **Choice:** Vitest
- **Rationale:** Fast, Vite-native testing aligned with SvelteKit.

### Package Manager
- **Choice:** npm
- **Rationale:** Default tooling and lowest friction.

## Development Environment

- **Node Version:** 20.x
- **Package Manager:** npm
- **IDE/Editor:** Not specified

## Dependencies

### Core Dependencies
```json
{
  "@sveltejs/kit": "latest",
  "svelte": "latest",
  "svelte-material-ui": "latest",
  "better-sqlite3": "latest"
}
```

### Development Dependencies
```json
{
  "vitest": "latest"
}
```

## Architecture Notes

- Use SvelteKit server routes for admin CRUD, import, and history endpoints.
- Keep SQL schemas and migrations explicit and versioned in the repo.
- Implement watch-completion logic in a shared server-side helper to ensure consistency.

## Future Considerations

- Consider introducing an ORM if SQL complexity grows.
- Re-evaluate UI component library choice if SMUI constraints appear.
- Add e2e tests (e.g., Playwright) if UI flows become complex.