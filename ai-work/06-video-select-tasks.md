## Relevant Files

- `src/routes/viewer/+page.svelte` - Main viewer page that will need selection state, cross-page selection handling, and the bulk-action bar UI.
- `src/lib/components/VideoCard.svelte` - Viewer card component that will need selected-state visuals and selection interaction wiring.
- `src/lib/components/DatePicker.svelte` - Existing filter component whose interactions may need to cooperate with selection clearing on filter changes.
- `src/routes/viewer/+page.server.ts` - Viewer route loader and actions that will need bulk flag update and undo endpoints.
- `src/lib/daos/flagsDAO.ts` - Existing flag persistence helper that may need bulk update support or related helpers.
- `src/lib/daos/videoDAO.ts` - Viewer query support that may need result ordering or identifier support for cross-page selection bookkeeping.
- `src/lib/entities/videoFlags.ts` - Existing flag shape that may need reuse in bulk-update result payloads.
- `tests/viewer/` - Route-level tests for bulk selection actions, undo, and cross-page selection-related server behavior.
- `tests/lib/` - DAO-level tests for bulk flag persistence helpers if shared data-layer logic is introduced.

## Tasks

- [x] 1.0 Define the bulk-selection state model and server contract for viewer multi-select actions
  - [x] 1.1 Define how the client tracks selected video ids, range anchor state, and cross-page selection within the current filtered result set
  - [x] 1.2 Define when selection is cleared, including filter changes and other viewer state transitions
  - [x] 1.3 Define the bulk-action request and response shape for watched, favorite, and ignored updates
  - [x] 1.4 Define the undo payload and response contract so the client can restore original mixed flag state after a bulk action
  - [x] 1.5 Define how bulk responses report full success, partial success, failed ids, and human-readable action feedback

- [x] 2.0 Add server-side bulk flag update and undo support for the viewer
  - [x] 2.1 Add shared persistence helpers or DAO support for applying one boolean flag value across many selected videos
  - [x] 2.2 Add a viewer bulk-action endpoint that can update watched, favorite, or ignored for a supplied selected set
  - [x] 2.3 Ensure the bulk-action endpoint returns enough detail for selected count, changed count, failed ids, and user-facing feedback
  - [x] 2.4 Add a viewer undo endpoint that can restore original flag values for the previously affected selected set
  - [x] 2.5 Ensure partial-failure cases are reported explicitly without hiding successful updates

- [x] 3.0 Add viewer multi-selection behavior across the filtered and paginated result set
  - [x] 3.1 Add client-side selection state management for selected ids, selection anchor, and current-page membership
  - [x] 3.2 Implement Ctrl or platform-equivalent additive selection on viewer cards
  - [x] 3.3 Implement Shift range selection based on the current selection anchor
  - [x] 3.4 Preserve selection across pagination within the current filtered result set
  - [x] 3.5 Clear selection automatically when the viewer filter set changes

- [ ] 4.0 Build the bulk-selection UI and selected-state affordances in the viewer
  - [x] 4.1 Add selected-state card visuals, including blue outline and blue checkmark feedback
  - [x] 4.2 Add a bulk-action bar that appears when one or more videos are selected
  - [x] 4.3 Show selected-count metadata and make it obvious when some selected videos are on other pages
  - [ ] 4.4 Add tri-state bulk controls for watched, favorite, and ignored, including mixed-state display behavior
  - [ ] 4.5 Add success, partial-failure, and undo feedback in the bulk-action bar while keeping the selection active

- [ ] 5.0 Validate bulk viewer selection, tri-state behavior, and undo with focused automated tests
  - [ ] 5.1 Add server or route tests for bulk watched, favorite, and ignored updates on selected id sets
  - [ ] 5.2 Add tests for undo restoring previous flag values, including mixed-state recovery cases
  - [ ] 5.3 Add tests covering partial-failure reporting and partial undo reporting
  - [ ] 5.4 Add client-relevant tests where practical for selection-clearing behavior on filter changes
  - [ ] 5.5 Run targeted validation for the new viewer bulk-selection flow using the existing project checks
