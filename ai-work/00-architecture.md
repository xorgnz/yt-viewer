# Architecture

## Current System Shape

The application is a single SvelteKit codebase that serves both UI and server behavior. It uses server routes plus explicit service classes for request handling, and direct SQL DAOs/read repositories for persistence against MySQL/MariaDB.

The dominant flow is:

1. route/load/action receives the request
2. shared server context resolves database connection, profile, and admin session state
3. a server-side service coordinates business logic
4. DAOs/read repositories execute SQL and hydrate entities or field-value structures
5. the route returns shaped data to Svelte components for rendering

## Major Boundaries

### Routes

`src/routes/` should stay thin. Routes are responsible for:

- parsing params, query strings, and form input
- resolving request-scoped context
- calling the right admin or viewer service
- converting service failures into route-level responses

They should not become the main home for business rules or cross-query orchestration.

### Server Services

`src/lib/server/admin/` and `src/lib/server/viewer/` hold request-facing application logic.

These services are the main orchestration layer for:

- admin CRUD and assignment workflows
- viewer loading, recommendations, flags, and watch history
- request-scoped validation and behavior decisions

Services should coordinate multiple DAOs/repositories when needed, but avoid embedding raw SQL directly.

### Persistence Layer

`src/lib/daos/` is split by responsibility:

- write-side DAOs for direct mutation and simple record access
- `readers/` for richer read-model queries
- `queries/` for reusable SQL query-spec construction
- `shared/` for DB pool, bootstrap, and migration infrastructure
- `migrations/` for forward-only schema changes

This project prefers explicit SQL over introducing an ORM.

### Entities And Data Shapes

`src/lib/entities/` contains entity classes plus simple field-value types that represent an entity without transport or database context.

The intended boundary is:

- each real domain object may have:
  - an entity class that carries behavior or object identity
  - a simple field-value type that represents the entity without extra context
- entity/data field names stay in TypeScript/domain shape
- DAOs are responsible for translating between database column naming and entity field naming
- DAOs should prefer SQL aliasing or similarly direct mapping at the persistence boundary instead of spreading database-shaped names through the app
- database-shaped row types should not leak broadly through the rest of the app
- aggregate/query-only result shapes that are not real entities may stay local to the DAO rather than becoming shared entity types

### DAO Responsibilities

DAOs are the persistence boundary for both reads and writes.

That means a DAO is responsible for:

- translating between database column names and TypeScript/domain field names
- hydrating entity instances or returning plain field-value objects where appropriate
- keeping SQL concerns local to the persistence layer

DAOs should not invent extra abstraction layers unless they remove real complexity. In particular:

- do not create duplicate domain field types and DAO row types unless the distinction is materially useful
- prefer one simple field-value object for a real entity, with the DAO handling database naming differences
- treat one-off aggregate results as DAO-local query shapes, not as full domain entities

### Viewer Client Logic

`src/lib/viewer/` and viewer-facing Svelte components contain client-side state and interaction logic such as:

- current filter state
- selection behavior
- bulk actions
- UI helpers for presentation and navigation

This layer should not become a second source of truth for persistence rules that already live on the server.

### YouTube Integration

`src/lib/youtube/` is the boundary for pulling remote YouTube data into the local system shape. Import/update logic should stay there rather than being spread through generic DAOs or routes.

## Core Data Relationships

The current product model revolves around these relationships:

- source channels own imported videos
- virtual channels group source channels through assignments
- selected-only review state sits on assignment/video combinations
- profiles own per-video flags and watch-history state

Important implication: several viewer behaviors are profile-scoped, while video/channel data is shared application data.

## Notable Structural Decisions

### Explicit Schema Ownership

Latest-schema DDL lives in `src/lib/daos/_schema.ts`, and forward migrations live in `src/lib/daos/migrations/`.

Fresh database creation and migration history must stay aligned:

- latest bootstrap defines the current schema directly
- migrations define deterministic forward transitions for existing databases

### Forward-Only Migration Model

Migration behavior is intentionally explicit and conservative. The system uses:

- versioned migration files
- explicit registration
- migration metadata
- latest-only upgrade flow

This is meant to support production-safe schema evolution without hidden startup migration behavior.

### Thin Routes, Explicit Services

The repository has already moved away from putting too much logic in route files. Preserve that direction. When behavior grows, prefer moving it behind named service objects rather than embedding it directly in load functions or form actions.

### Direct SQL Instead Of ORM

The project intentionally uses direct SQL helpers. The tradeoff is more explicit query maintenance, but clearer control over schema, joins, migrations, and production data changes.

### Naming Conventions

Use explicit suffixes where they clarify architectural role.

Current standardized conventions include:

- `*DAO` for persistence-boundary classes that own SQL translation and record mutation/access
- `*Service` for request-facing orchestration or business-workflow coordination
- `*Fields` for plain field-value structures that represent an entity without transport or storage context
- `*ViewModel` for UI-facing projection shapes prepared for rendering rather than domain behavior
- `*Panel.svelte` for panel-style presentational components, with associated view-model files named to include the same concept plus the `ViewModel` suffix when a dedicated UI projection type is needed

These suffixes should be used deliberately rather than mechanically. If a type or class does not clearly fit the role implied by the suffix, rename the object or choose a more accurate boundary.

## Important Constraints

### Stable-ID Pressure

A major unresolved architectural issue is that much of the schema still relies on generated serial row IDs as cross-table relationship identifiers. Feature `09-stable-db-ids` exists to replace that relationship contract with stable IDs and safer foreign-key design.

That means current code should avoid deepening dependence on generated row IDs where new work can reasonably avoid it.

### Timer Feature Constraint

Feature `10-timers` is intentionally using persisted watch-history data as the accounting source for playback caps. That means timer enforcement should be built on top of existing watch-history persistence rather than introducing a parallel timer ledger unless the current model proves insufficient.

### Shared Time Boundary Decision

The timer PRD assumes day-window calculations tied to a user-configurable timezone midnight, but the shared application timezone source is not yet documented in the master tech stack. Any timer implementation that depends on day windows needs that decision made clearly and then applied consistently.

## Important Data Flows

### Import And Curation

1. fetch YouTube channel/video data
2. persist source channels and videos
3. associate source channels with virtual channels
4. optionally refine selected-only inclusion state
5. expose those results in viewer queries

### Viewer State

1. load viewer page through query parsers and viewer services
2. read filtered video results and related metadata from read repositories
3. update watched/favorite/ignored flags through server actions and DAOs
4. record watch-history session progress independently from watched-state changes

### Schema Evolution

1. update latest schema
2. add the next forward migration
3. register the migration
4. validate fresh-create and migration paths together

## Practical Guidance For Future Changes

- Keep route handlers thin.
- Put cross-query business logic in services.
- Keep SQL explicit and local to DAOs/read repositories.
- Use entity field names in TypeScript and do database-column mapping in the DAO layer.
- Treat `ai-work/00-feature-status.md` and `ai-work/00-master-techstack.md` as workflow/source-of-truth documents when work depends on current feature state or shared tech decisions.
