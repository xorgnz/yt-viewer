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

#### Selection State Tracking

9. The client must track selection as a set of selected video ids rather than as page-local row positions.
10. The client must track a selection anchor video id for Shift range behavior, and that anchor must update on non-Shift explicit selection actions.
11. The client must treat cross-page selection as membership within the current filtered result set, not just the currently rendered page.
12. The client must maintain or receive enough ordered result-set identity data to resolve Shift ranges consistently even when the range spans multiple pages.
13. The client must derive a selection-context key from the active viewer filters and profile so it can invalidate the selected set and range anchor when that context changes.
14. The current page should be treated as a visible slice of the same filtered result-set selection model rather than as an isolated selection scope.

#### Selection Clearing Rules

- The selected set and selection anchor must clear when any viewer filter input changes the filtered result-set context.
- Pagination changes alone must not clear selection because they remain inside the same filtered result set.
- Profile changes must clear selection because flag state and visible result membership are profile-scoped.
- Explicit user actions to clear selection must remove the selected set, selection anchor, bulk-action feedback, and any pending undo scope tied only to the previous selection context.
- Successful or partially successful bulk actions must not clear selection automatically.
- Route transitions away from the viewer page may discard in-memory selection state without persistence requirements.

### Visual Treatment

15. Selected video cards must display a clear selected-state treatment.
16. The selected-state treatment should include a blue outline and a blue checkmark indicator or equivalent clearly visible affordance.
17. The selected-state treatment must coexist with existing watched, favorite, and ignored visual treatments without making selection ambiguous.

### Bulk Action Bar

18. A bulk-action bar must appear when one or more videos are selected.
19. The bulk-action bar must display the count of selected videos.
20. The bulk-action bar must make it obvious when part of the current selection is on another page.
21. The bulk-action bar must expose controls for watched, favorite, and ignored.

### Tri-State Bulk Controls

22. Each bulk flag control must support three visible states for the current selection:
    - unset when all selected videos have the flag unset
    - set when all selected videos have the flag set
    - mixed when the selected videos contain both states
23. Mixed state may use a square or equivalent visual treatment distinct from checked and unchecked.
24. Clicking a control in the unset state must set that flag on all selected videos.
25. Clicking a control in the set state must clear that flag on all selected videos.
26. Clicking a control in the mixed state must first set that flag on all selected videos.
27. A subsequent click after reaching the set state must clear that flag on all selected videos.
28. Watched status must follow the same tri-state behavior as favorite and ignored.

### Bulk Update Behavior

29. Bulk updates must operate on the entire current selected set, including selected items not visible on the current page.
30. The system should attempt to apply the chosen update to all selected videos.
31. If some items fail to update, the system must report that clearly.
32. The success message must summarize the completed action, for example `12 videos marked ignored`.
33. After a bulk action succeeds or partially succeeds, the selection must remain active.
34. The bulk-action bar must display recent action feedback while selection remains active.

### Undo

35. The UI must provide an undo action after a bulk update.
36. Undo must attempt to restore the original flag state for the affected selected videos.
37. Undo must support recovery from the mixed-state workflow by restoring the original mixed distribution when possible.
38. If undo only partially succeeds, the UI must report that clearly.
39. Undo should be available from the bulk-action bar or an equally obvious nearby location.

#### Undo Contract

- The undo request must identify the original bulk action it is reversing, not just the currently selected set.
- The undo payload must carry the per-video original flag values needed to restore pre-action state for the affected ids.
- The undo payload must be scoped to one target flag and one bulk action at a time.
- The undo request must tolerate partially successful original actions by restoring only ids for which original-state data exists.
- The undo response must report restored ids, failed ids, and any ids that were skipped because no reversible prior state was available.
- The undo contract must support restoring a previously mixed selection back to its original distribution rather than only toggling all ids to one shared value.

### Data and Server Behavior

40. The implementation must reuse the existing per-video boolean flag model for watched, favorite, and ignored rather than introducing a separate bulk-only state model.
41. The viewer must gain server-side support for bulk flag updates over a list of selected video identifiers.
42. The viewer must gain server-side support for undoing the most recent bulk update scope represented by the client request.
43. Bulk update and undo responses must return enough result detail for the client to show success, partial-failure, and mixed-state recovery feedback.

#### Bulk Action Request Contract

- The bulk-action request must identify exactly one target flag per request: `watched`, `favorite`, or `ignored`.
- The request must carry the selected video ids as explicit identifiers rather than as page-local indexes.
- The request must carry the desired target boolean value for the selected set so mixed-state transitions resolve deterministically.
- The request must carry enough selection-context information to reject or safely ignore stale requests generated from an outdated filter context when needed.
- The request should carry lightweight client context metadata, such as selected-count and whether selection spans multiple pages, only when it materially improves validation or response messaging.

#### Bulk Action Response Contract

- The bulk-action response must identify the target flag and the requested target boolean value.
- The response must report the total selected count and the count of ids the server attempted to process.
- The response must report which ids were successfully updated and which ids failed.
- The response must provide enough original-state information for a follow-up undo request covering the same action scope.
- The response must include user-facing summary text suitable for the bulk-action bar without requiring the client to reconstruct the action meaning from low-level fields.

#### Bulk Response Reporting Rules

- The response must classify the outcome as full success, partial success, or failed.
- Full success means every requested eligible id was updated to the requested target value.
- Partial success means at least one requested id was updated and at least one requested id failed or was skipped.
- Failed means no requested id was updated successfully.
- The response must include counts for selected ids, attempted ids, succeeded ids, failed ids, and skipped ids when applicable.
- The response must include failed-id detail suitable for diagnostics without forcing the main user-facing message to expose raw identifiers.
- The response must include concise human-readable feedback for the action bar, such as `12 videos marked ignored` or `9 videos updated, 3 failed`.
- Undo responses must follow the same reporting structure so the client can present consistent post-action messaging.

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
