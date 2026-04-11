# Draft PRD: Repository Refactoring

## 1. Introduction/Overview

This feature restructures the repository to improve architectural boundaries, reduce duplicated infrastructure, and make future feature work safer and faster. The refactor is intentionally cross-cutting because the current architectural problems are shared across viewer UI, route/server handlers, persistence access, YouTube integration, and test setup rather than being isolated to one layer.

The refactor should preserve user-facing behavior as closely as practical, but moderate restructuring is acceptable when it materially improves modularity, encapsulation, and reuse. The main objective is to reduce oversized modules and route-owned business logic while establishing clearer service, repository, and shared infrastructure boundaries.

## 2. Goals

1. Introduce clearer application boundaries between routes, services, DAOs/repositories, integrations, and UI state modules.
2. Remove repeated route/server setup for environment mode, database access, profile/session resolution, and common validation patterns.
3. Break down the largest viewer modules into smaller, more focused units.
4. Introduce an explicit service layer for route-owned workflows and thinner persistence boundaries beneath it.
5. Improve reuse of infrastructure, fixtures, helpers, and test setup across the codebase.
6. Keep behavior effectively equivalent while making the codebase easier to extend and maintain.

## 3. User Stories

- As a developer, I want route files to orchestrate rather than own business workflows, so feature work does not require editing large server modules.
- As a developer, I want shared request-scoped infrastructure for DB/profile/session setup, so server code stops repeating the same boilerplate.
- As a developer, I want the viewer feature split into smaller UI and state modules, so changes to selection, filters, pagination, and bulk actions are easier to reason about.
- As a developer, I want integration code and persistence code to have explicit boundaries, so behavior can be tested in smaller units.
- As a maintainer, I want refactor slices to include their own test updates, so architecture changes remain verifiable as they land.

## 4. Functional Requirements

1. The refactor must be delivered in phases ordered primarily by layer rather than as one broad rewrite.
2. Phase 1 must prioritize the viewer surface, including decomposition of oversized viewer server, UI, and state modules.
3. The feature must introduce shared server-side infrastructure for environment mode resolution, database wrapper setup, and profile/session resolution where repetition currently exists.
4. Route handlers should be refactored toward thin orchestration layers that delegate business workflows to explicit service modules.
5. The refactor should introduce a service layer aggressively enough that business workflows are no longer primarily embedded inside route files.
6. Persistence concerns should be reorganized so complex query shaping and workflow logic are no longer mixed indiscriminately inside DAOs.
7. The viewer UI refactor should include component splitting where doing so materially improves clarity and responsibility boundaries.
8. The YouTube integration layer should be reorganized to separate transport, reference resolution, orchestration, and persistence application responsibilities.
9. Shared test harnesses and fixture utilities should be introduced where existing tests duplicate database setup or migration fixture creation.
10. Each refactor slice must include the test updates needed to validate the affected behavior and architecture boundaries.
11. Obsolete code paths may be removed once the replacement path is complete and verified.
12. The feature must not rely on silent behavior changes as a substitute for architectural clarity.

## 5. Non-Goals

- Delivering major new end-user features unrelated to refactoring
- Replacing SvelteKit, SQLite, or the project's core technology choices
- Redesigning user workflows for product reasons rather than architectural reasons
- Performing broad cleanup that is not tied to a clear structural outcome
- Deferring all test work until the very end of the feature

## 6. Delivery Phasing

### Phase 1: Shared Server Infrastructure and Viewer Decomposition

- Extract shared server infrastructure needed by the viewer path
- Decompose viewer route/server logic into thinner orchestration plus services
- Split viewer UI/state modules into smaller focused units
- Add supporting tests as each slice lands

### Phase 2: Service-Layer Expansion Across Admin and Integration Workflows

- Apply the same route-to-service pattern across admin flows
- Separate YouTube import/orchestration responsibilities more clearly
- Reduce route-owned validation and database orchestration where practical
- Add supporting tests for each migrated workflow

### Phase 3: Persistence Boundary Cleanup and Cross-Cutting Test Reuse

- Refine DAO/repository boundaries for complex queries and read models
- Consolidate shared test harness and fixture setup
- Remove obsolete code paths once replacements are proven
- Close remaining high-value architectural duplication

## 7. Design Considerations

- Prefer incremental module extraction over wholesale rewrites.
- Use architecture changes to reduce responsibility concentration in the largest files first.
- Preserve current behavior unless a restructuring improvement clearly justifies a small compatible cleanup.
- Favor explicit boundaries and naming over clever abstractions.
- Keep new shared modules reusable by multiple route families where that reuse is real rather than speculative.

## 8. Technical Considerations

- Current hotspots include the viewer page server module, the viewer page Svelte component, and the viewer selection state module.
- Several route files independently resolve environment mode, open databases, resolve profiles, and perform similar validation work.
- Some business workflows currently couple route handlers directly to DAO orchestration.
- Some complex read/query behavior is embedded inside DAOs, which makes reuse and testing harder.
- Migration and bootstrap work introduced new shared infrastructure that should be aligned with the broader repository architecture rather than left as a parallel pattern.

## 9. Success Metrics

- Major route/server hotspots are reduced into smaller modules with clearer responsibilities.
- Shared server infrastructure replaces repeated request-scoped setup patterns in multiple routes.
- Viewer-related UI/state logic is decomposed into maintainable units.
- Business workflows become testable outside route handlers through explicit services.
- Persistence and integration boundaries are clearer and easier to reuse.
- Each completed refactor slice lands with corresponding test coverage updates.

## 10. Clarifications Applied

- The feature is broad and cross-cutting across UI, routes, services, data, integrations, and tests.
- Phase 1 should prioritize the viewer area.
- Overall delivery should be phased by layer rather than as a single vertical rewrite.
- Service extraction should be aggressive enough to create explicit architectural boundaries.
- Every slice should include its own test updates.
- Viewer refactoring should include component splitting where warranted.
- Moderate restructuring is acceptable as long as user-facing behavior remains effectively equivalent.
- Obsolete code may be removed once replacement behavior is complete and verified.
