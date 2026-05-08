# Tasks: 11-viewer-structure-refactor

## Relevant Files

- `src/lib/viewer/pageState.ts` - Large viewer state helper surface with mixed responsibilities around filters, pagination, group lookup, and selection summaries.
- `src/lib/viewer/bulkActions.ts` - Bulk-action helper surface that likely wants clearer ownership and grouping.
- `src/lib/viewer/selectionInteractions.ts` - UI interaction rules that may belong under a clearer viewer-selection boundary.
- `src/lib/viewer/sortSession.ts` - Small persistence-focused viewer concern that should either remain a narrow utility or move under a clearer model boundary.
- `src/lib/viewer/selection/` - Existing selection sub-area that likely needs clearer class ownership and file structure.
- `src/lib/viewer/types.ts` - Shared viewer-facing types that will need reshaping as class boundaries change.
- `src/routes/viewer/+page.svelte` - Main viewer page with substantial controller-style logic embedded in the component.
- `src/routes/viewer/watch/[videoId]/+page.svelte` - Watch page with substantial controller/state logic embedded in the component.
- `src/routes/viewer/virtual-channels/+page.svelte` - Virtual-channel chooser UI that may need to align with refactored group/view models.
- `src/lib/viewer/components/ViewerFilterPanel.svelte` - Viewer filter presentation that depends on current page-state contracts.
- `src/lib/viewer/components/ViewerResultsGrid.svelte` - Viewer results presentation and interactions tied to current viewer models.
- `src/lib/viewer/components/ViewerBulkActionBar.svelte` - Bulk-action UI tied to current selection and action-state contracts.
- `src/lib/viewer/components/ViewerPagination.svelte` - Pagination UI tied to current page-state contracts.
- `src/lib/components/VideoCard.svelte` - Shared viewer-facing card interaction surface that may need clearer model boundaries.
- `src/lib/components/DatePicker.svelte` - Component with many embedded helper functions that may need clearer internal or extracted structure.
- `src/lib/components/SideNav.svelte` - Small helper surface worth evaluating for narrow utility vs. component-local logic.
- `src/lib/server/viewer/ViewerLoadService.ts` - Viewer server entry orchestration that may need boundary cleanup if the refactor reaches server glue.
- `src/lib/server/viewer/ViewerPageLoader.ts` - Main viewer page assembly logic and a likely candidate for clearer facade boundaries.
- `src/lib/server/viewer/ViewerServiceContext.ts` - Viewer service composition root that may need adjustment as class boundaries change.
- `src/lib/server/viewer/ViewerWatchService.ts` - Stateful viewer workflow logic that may need clearer model/facade boundaries.
- `src/lib/server/viewer/ViewerVirtualChannelService.ts` - Viewer-side virtual-channel model/facade logic that should stay aligned with the new architecture.
- `src/lib/server/viewer/ViewerRecommendationService.ts` - Viewer recommendation logic that may need clearer ownership boundaries.
- `src/lib/server/viewer/ViewerActionParser.ts` - Request-parsing helper that may need structural cleanup if similar function-sprawl issues appear.
- `src/lib/server/viewer/ViewerQueryParser.ts` - Query parsing helper that may need clearer ownership or grouped stateless utility structure.
- `src/lib/server/RuntimeDatabaseUrl.ts` - Example of a function-only helper outside the viewer layer worth evaluating under the same standards.
- `ai-work/00-architecture.md` - Must be updated to explain the resulting structure and include class inventory material.
- `tests/` - Viewer, DAO, route, and server-layer tests that must be updated to preserve behavior through the refactor.

## Tasks

- [ ] 1 - Audit the current viewer and adjacent structure
  - [ ] 1.1 - Inventory non-trivial floating-function modules across `src/lib/viewer/`, viewer routes/components, and adjacent areas with similar structural problems.
  - [ ] 1.2 - Identify the major viewer concerns that need one obvious owning class or module, including selection, filters, page state, bulk actions, watch-page behavior, and virtual-channel navigation.
  - [ ] 1.3 - Identify helper surfaces that should remain stateless utilities and group them by a clear shared purpose instead of scattering them into tiny wrapper classes.

- [ ] 2 - Design the target class and module boundaries
  - [ ] 2.1 - Define the target class ownership model for the main viewer concerns using the approved MVC-like direction.
  - [ ] 2.2 - Decide which current helper modules become entity, facade, or state classes, which remain stateless utility libraries, and which should disappear entirely.
  - [ ] 2.3 - Define aggressive file and folder renames needed to make responsibilities obvious in the refactored structure.

- [ ] 3 - Refactor viewer state and selection structure
  - [ ] 3.1 - Replace the current `pageState`, `bulkActions`, and selection helper grab-bags with clearer class-based ownership where behavior or state is non-trivial.
  - [ ] 3.2 - Reshape viewer selection modules so stateful selection behavior is attached to concept-owning classes and only narrow stateless helpers remain.
  - [ ] 3.3 - Update shared viewer-facing types and interfaces to match the new ownership boundaries without leaking transitional structure.

- [ ] 4 - Refactor viewer route and component controller logic
  - [ ] 4.1 - Reduce controller-style logic embedded in `src/routes/viewer/+page.svelte` by moving non-trivial state or workflow behavior behind explicit classes or grouped stateless libraries.
  - [ ] 4.2 - Reduce controller-style logic embedded in `src/routes/viewer/watch/[videoId]/+page.svelte` with the same standards.
  - [ ] 4.3 - Update viewer components so they depend on clearer model or facade boundaries rather than broad helper surfaces.

- [ ] 5 - Refactor adjacent server-side viewer glue where needed
  - [ ] 5.1 - Review `src/lib/server/viewer/` for the same weak-boundary problems and refactor service or facade structure where it materially improves modular clarity.
  - [ ] 5.2 - Keep route handlers thin and ensure server-side orchestration remains aligned with the refactored viewer-side model.
  - [ ] 5.3 - Refactor any other nearby function-sprawl modules outside the viewer layer when they materially contribute to the same maintainability problem.

- [ ] 6 - Update architecture documentation and class inventory
  - [ ] 6.1 - Update `ai-work/00-architecture.md` to explain the refactored structure, major boundaries, and collaboration model.
  - [ ] 6.2 - Add the required class inventory with a 1-2 sentence description of each meaningful class in the affected architecture.
  - [ ] 6.3 - Ensure the architecture write-up explains why remaining utility modules exist and how they are grouped by purpose.

- [ ] 7 - Preserve behavior and validate the refactor
  - [ ] 7.1 - Update or add focused tests for refactored viewer, route, and server boundaries so behavior remains intact.
  - [ ] 7.2 - Verify that no non-trivial viewer workflow depends on broad helper grab-bags after the refactor.
  - [ ] 7.3 - Verify that remaining utility libraries are stateless, grouped sensibly, and easy to justify.
