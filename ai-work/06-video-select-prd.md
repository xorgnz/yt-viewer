# Product Requirements Document: Video Multi-Select

## Overview

The viewer currently supports flag changes only one video at a time. This feature adds multi-selection and bulk flag updates so users can curate large result sets efficiently without repeating the same action on individual cards.

The feature will support mouse-based range and additive selection, cross-pagination selection within the current filtered result set, and a bulk-action bar that exposes tri-state bulk controls for watched, favorite, and ignored flags. The experience should make selection scope and result feedback obvious, especially when selected items extend beyond the current page.

## Goals

1. Let users select many videos quickly in the viewer and apply flag changes in bulk.
2. Make selected state and bulk-action scope visually obvious.
3. Preserve confidence when selection spans multiple pages or when bulk updates partially fail.
4. Keep the workflow compatible with the existing viewer filters, pagination, and flag model.

## User Stories

- As a viewer user, I want to Ctrl-select individual videos so I can build a custom set.
- As a viewer user, I want to Shift-select a range so I can select many adjacent videos quickly.
- As a viewer user, I want to keep selection across pages in the same filtered result set so I can act on a larger batch.
- As a viewer user, I want to see how many videos are selected and whether some are on other pages.
- As a viewer user, I want bulk controls for watched, favorite, and ignored that reflect whether the selected set is fully set, fully unset, or mixed.
- As a viewer user, I want to undo a bulk action so I can recover from mistakes or partial failures.

## Requirements

### Selection Model

1. The viewer video list must support additive multi-selection using normal mouse modifier behavior.
2. On Windows and similar platforms, Ctrl-click must add or remove a single video from the selected set.
3. On macOS, the implementation should follow normal platform expectations where practical.
4. Shift-click must select a contiguous range based on the current selection anchor.
5. Selection must work across pagination within the current filtered result set.
6. Selection must clear automatically when the filter set changes.
7. Selection does not need to persist across full page reloads, sessions, or unrelated viewer contexts.
8. Keyboard-only multi-selection behavior is out of scope for this version.

### Visual Treatment

9. Selected video cards must display a clear selected-state treatment.
10. The selected-state treatment should include a blue outline and a blue checkmark indicator or equivalent clearly visible affordance.
11. The selected-state treatment must coexist with existing watched, favorite, and ignored visual treatments without making selection ambiguous.

### Bulk Action Bar

12. A bulk-action bar must appear when one or more videos are selected.
13. The bulk-action bar must display the count of selected videos.
14. The bulk-action bar must make it obvious when part of the current selection is on another page.
15. The bulk-action bar must expose controls for watched, favorite, and ignored.

### Tri-State Bulk Controls

16. Each bulk flag control must support three visible states for the current selection:
    - unset when all selected videos have the flag unset
    - set when all selected videos have the flag set
    - mixed when the selected videos contain both states
17. Mixed state may use a square or equivalent visual treatment distinct from checked and unchecked.
18. Clicking a control in the unset state must set that flag on all selected videos.
19. Clicking a control in the set state must clear that flag on all selected videos.
20. Clicking a control in the mixed state must first set that flag on all selected videos.
21. A subsequent click after reaching the set state must clear that flag on all selected videos.
22. Watched status must follow the same tri-state behavior as favorite and ignored.

### Bulk Update Behavior

23. Bulk updates must operate on the entire current selected set, including selected items not visible on the current page.
24. The system should attempt to apply the chosen update to all selected videos.
25. If some items fail to update, the system must report that clearly.
26. The success message must summarize the completed action, for example `12 videos marked ignored`.
27. After a bulk action succeeds or partially succeeds, the selection must remain active.
28. The bulk-action bar must display recent action feedback while selection remains active.

### Undo

29. The UI must provide an undo action after a bulk update.
30. Undo must attempt to restore the original flag state for the affected selected videos.
31. Undo must support recovery from the mixed-state workflow by restoring the original mixed distribution when possible.
32. If undo only partially succeeds, the UI must report that clearly.
33. Undo should be available from the bulk-action bar or an equally obvious nearby location.

### Data and Server Behavior

34. The implementation must reuse the existing per-video boolean flag model for watched, favorite, and ignored rather than introducing a separate bulk-only state model.
35. The viewer must gain server-side support for bulk flag updates over a list of selected video identifiers.
36. The viewer must gain server-side support for undoing the most recent bulk update scope represented by the client request.
37. Bulk update and undo responses must return enough result detail for the client to show success, partial-failure, and mixed-state recovery feedback.

## Constraints and Considerations

- Filter changes invalidate the current selection.
- Cross-pagination selection should remain understandable and must not silently imply “all videos everywhere.”
- The feature should be scoped to the main viewer video list only.
- Existing single-video flag controls may remain available unless implementation simplicity strongly favors disabling or adapting them during selection mode.
- Selection behavior should feel fast and should not require full-page workflow friction beyond the existing viewer architecture.

## Non-Goals

- Keyboard-only selection workflows
- Bulk operations outside the viewer list
- Persisting selection across sessions
- Broad redesign of the viewer layout beyond selection and bulk-action support

## Clarifications Applied

- The tri-state controls represent target state for the selected set.
- Persistence behavior may still partially succeed; partial success must be reported and undo must be offered.
- “Across pagination” means across the current filtered result set, not across unrelated filter states.

## Success Criteria

- Users can select videos with Ctrl/Cmd and Shift workflows in the viewer.
- Users can apply watched, favorite, and ignored changes to the selected set from one bulk-action area.
- Users can tell when selection spans pages.
- Users receive clear success or partial-failure feedback and can undo the last bulk action.
