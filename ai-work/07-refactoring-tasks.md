## Relevant Files

- `src/routes/+layout.server.ts` - Shared route entrypoint that currently participates in repeated database/profile setup and should consume common server context helpers.
- `src/routes/history/+page.server.ts` - Secondary route hotspot for repeated request-scoped database and profile setup patterns.
- `src/routes/viewer/+page.server.ts` - Main viewer route hotspot that should be split into thin orchestration, typed parsing, and service calls.
- `src/routes/viewer/+page.svelte` - Oversized viewer page component that should be decomposed into smaller UI modules.
- `src/lib/viewerSelection.ts` - Viewer selection state, persistence, and control derivation module that should be broken into focused pieces.
- `src/routes/admin/virtual-channels/+page.server.ts` - Admin workflow route that should delegate business operations to explicit services.
- `src/routes/admin/virtual-channels/[virtualChannelId]/+page.server.ts` - Assignment-management route with repeated validation and orchestration logic to extract.
- `src/routes/admin/source-channels/+page.server.ts` - Source-channel refresh/import route that currently mixes request handling, YouTube orchestration, and persistence work.
- `src/routes/admin/login/+page.server.ts` - Authentication route with typing cleanup opportunities during shared server-helper extraction.
- `src/lib/profiles.ts` - Existing profile utilities that should be folded into clearer shared request-context and session-resolution helpers.
- `src/lib/auth/admin.ts` - Existing admin auth utilities that should become part of a more explicit server-side guard boundary.
- `src/lib/daos/videoDAO.ts` - Viewer query and persistence hotspot that should be narrowed to persistence responsibilities.
- `src/lib/daos/historyDAO.ts` - History query and persistence hotspot that should follow the same repository/query-spec split.
- `src/lib/daos/shared/` - Existing database bootstrap and migration utilities that should align with the broader shared server and persistence architecture.
- `src/lib/youtube/fetch.ts` - Transport-layer YouTube logic that should stay separate from orchestration and persistence application.
- `src/lib/youtube/importer.ts` - Current YouTube import orchestration hotspot that should be decomposed into smaller service collaborators.
- `src/lib/youtube/youTubeClient.ts` - API client boundary that should remain narrow and reusable beneath higher-level services.
- `tests/viewer/` - Route and query tests that must be updated as viewer server and UI responsibilities move.
- `tests/admin/` - Route tests that should be expanded as admin workflows move behind explicit services.
- `tests/lib/` - Unit-test area for extracted helpers, services, DAO/query-spec modules, and viewer state logic.

### Notes

- Each refactor slice should preserve current user-facing behavior unless a small compatible cleanup is required to support a clearer boundary.
- Prefer SvelteKit-native route, load, and action patterns while moving reusable work into shared `src/lib/` modules.
- Every parent task should land with the tests needed to cover the extracted boundary before obsolete code is removed.
- Consult `/ai-work/00-master-techstack.md` for the approved shared stack and tooling choices.
- Use Windows-compatible, non-interactive commands in this repository, consistent with `AGENTS.md`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [x] 1.0 Extract shared server request context and common route infrastructure
  - [x] 1.1 Create shared helpers for environment/database mode resolution, `DatabaseWrapper` setup, and request-scoped cleanup that can be reused across viewer, history, and admin routes
  - [x] 1.2 Extract profile/session resolution and admin-guard helpers from route files into explicit server-side modules built on `profiles.ts` and `auth/admin.ts`
  - [x] 1.3 Refactor `+layout.server.ts`, `history/+page.server.ts`, viewer routes, and admin layout/routes to consume the shared request-context helpers instead of duplicating setup logic
  - [x] 1.4 Consolidate repeated route-level parsing and validation helpers where the same request-shape handling appears across multiple server files
  - [x] 1.5 Add or update route-level tests that lock down the shared context behavior before later service extraction changes build on it

- [x] 2.0 Decompose viewer server workflows into thin route handlers plus explicit services
  - [x] 2.1 Split viewer query parsing, filter normalization, and load-model assembly out of `src/routes/viewer/+page.server.ts` into focused modules
  - [x] 2.2 Introduce viewer service modules for bulk flag updates, selection-aware operations, and result loading so route actions stop owning business workflows
  - [x] 2.3 Refactor `src/routes/viewer/+page.server.ts` into thin load/action handlers that map request data to service calls and response shaping
  - [x] 2.4 Align `src/routes/viewer/virtual-channels/+page.server.ts` and `src/routes/viewer/watch/[videoId]/+page.server.ts` with the same shared request-context and viewer-service patterns where responsibilities overlap
  - [x] 2.5 Update `tests/viewer/` coverage so the extracted services and thinner route handlers preserve current viewer behavior

- [ ] 3.0 Split viewer UI and selection state into smaller, reusable modules
  - [ ] 3.1 Break `src/routes/viewer/+page.svelte` into focused components for filters, result presentation, bulk actions, and pagination
  - [ ] 3.2 Move viewer page state derivation and event orchestration into smaller viewer-focused modules so the page component becomes a composition root
  - [ ] 3.3 Split `src/lib/viewerSelection.ts` into a small selection-state core plus persistence/session-storage integration and selection-summary/control helpers
  - [ ] 3.4 Reuse or extract shared viewer-oriented display helpers where page-local UI logic is currently tightly coupled to the route component
  - [ ] 3.5 Add or update viewer state and component-oriented tests for the extracted UI and selection modules

- [ ] 4.0 Expand service-layer boundaries across admin and YouTube integration workflows
  - [ ] 4.1 Move virtual-channel create/update/delete and assignment-management workflows out of admin route files into explicit services with typed inputs
  - [ ] 4.2 Move source-channel lookup, refresh, and import orchestration out of `src/routes/admin/source-channels/+page.server.ts` into services with narrower dependencies
  - [ ] 4.3 Refactor `src/lib/youtube/importer.ts` so transport, reference resolution, mapping, and persistence application are separated into smaller collaborators
  - [ ] 4.4 Tighten admin action typing and shared form parsing, including removal of remaining `any`-style escape hatches where practical
  - [ ] 4.5 Update `tests/admin/` and `tests/lib/youtube/` coverage to validate the new service boundaries while preserving route behavior

- [ ] 5.0 Separate query specification, read-model shaping, and persistence execution in the data layer
  - [ ] 5.1 Introduce explicit query-spec or read-model helpers for viewer and history filtering so DAOs stop mixing workflow semantics with SQL execution
  - [ ] 5.2 Refactor `src/lib/daos/videoDAO.ts` to narrow its responsibility to persistence and mapping while moving query construction into shared collaborators
  - [ ] 5.3 Refactor `src/lib/daos/historyDAO.ts` using the same boundary conventions and update affected service or route callers
  - [ ] 5.4 Align shared database bootstrap and migration utilities under `src/lib/daos/shared/` with the same boundary conventions so infrastructure code does not diverge
  - [ ] 5.5 Update DAO-focused tests to cover the extracted query helpers directly as well as the narrower DAO behavior

- [ ] 6.0 Consolidate shared test harnesses and fixture builders across refactor slices
  - [ ] 6.1 Extract reusable in-memory database/bootstrap helpers from viewer, admin, DAO, and migration tests
  - [ ] 6.2 Add fixture builders for profiles, videos, flags, assignments, and migration-state scenarios that reduce repeated setup
  - [ ] 6.3 Migrate refactored route, service, and DAO tests to the shared harness as each architectural slice lands
  - [ ] 6.4 Add focused service-layer tests where route tests were previously the only executable coverage for business workflows
  - [ ] 6.5 Remove superseded one-off test helpers once the shared harness covers the same behavior

- [ ] 7.0 Remove obsolete code paths and finish repository-wide consistency cleanup
  - [ ] 7.1 Delete superseded route-local helpers, duplicated setup code, and obsolete workflow paths once replacement behavior is verified
  - [ ] 7.2 Normalize naming and placement for new shared server, service, viewer, and persistence modules so future work has a clear home
  - [ ] 7.3 Tighten exported types and public interfaces for new modules to improve encapsulation and reduce implicit cross-layer coupling
  - [ ] 7.4 Run final repo-wide validation and resolve any import, typing, dead-code, or test regressions introduced by the refactor
