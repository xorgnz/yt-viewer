# Product Requirements Document: Inline Assignment Controls

## 1. Introduction/Overview

This feature improves the admin workflow for basic virtual-channel assignment management by moving common add/remove actions directly onto the virtual channels page. Instead of navigating away to inspect which source channels are attached to a virtual channel, the admin should be able to see those associations inline and make lightweight edits in place.

The goal is to reduce clicks and remove redundant admin navigation for simple assignment work while preserving the dedicated manage page for deeper configuration. This feature focuses on listing associated source channels, attaching already imported source channels inline, and removing associations inline without a full page reload.

## 2. Goals

1. Show associated source channels inline for each virtual channel on the admin virtual-channels page.
2. Allow the admin to add already imported source channels directly from the virtual-channels page.
3. Allow the admin to remove existing source-channel associations inline with confirmation.
4. Update the visible assignment list after inline changes without a full page reload.
5. Preserve the existing `Manage` link for deeper per-channel configuration.

## 3. User Stories

- As an admin, I want to see which source channels are attached to each virtual channel without leaving the virtual-channels page.
- As an admin, I want to add an already imported source channel inline so I can make simple assignment changes quickly.
- As an admin, I want already associated source channels excluded from the add dropdown so I do not waste time choosing invalid options.
- As an admin, I want to remove an association inline with confirmation so I can clean up assignments quickly without accidental deletion.
- As an admin, I want the page to update in place after add/remove actions so the workflow feels immediate and does not interrupt my work.
- As an admin, I want to keep the `Manage` link available so I can still jump to deeper configuration when needed.

## 4. Functional Requirements

1. The admin virtual-channels page must show the source channels currently associated with each virtual channel.
2. The inline source-channel list must be visible by default rather than hidden behind a collapsed control.
3. Each virtual channel must provide an inline control for adding a new source-channel association.
4. The add control must only offer already imported source channels.
5. The add control must exclude source channels already associated with the current virtual channel.
6. The page must allow the admin to submit an inline add-association action for a selected source channel.
7. The page must allow the admin to remove an existing source-channel association inline.
8. Inline removal must require confirmation before the request is sent.
9. Inline add and remove actions must send changes to the backend and update the on-page list without a full page reload.
10. The page must reflect successful add/remove operations in the rendered assignment list immediately after the backend confirms the change.
11. The page should surface add/remove failures clearly enough for the admin to understand what went wrong.
12. The existing `Manage` link for each virtual channel must remain available.
13. This feature must not move deeper assignment configuration, review tools, or bulk actions onto the virtual-channels list page.
14. This feature must not remove the standalone assignments page yet.

## 5. Non-Goals

- Removing the standalone assignments page in this phase
- Inline editing of assignment mode on the virtual-channels list page
- Inline selected-only review tools, filters, or bulk actions on the list page
- Inline source-channel import or creation from the add control
- Viewer-side changes

## 6. Design Considerations

- The virtual-channels page should keep assignment summaries readable while remaining scan-friendly.
- Inline controls should feel lightweight and fast, not like a second full management page.
- Associated source-channel names should be easy to parse visually.
- The add control should avoid clutter when a virtual channel already has many associations.
- Inline updates should avoid full-page disruption and should preserve the feeling of working in place.
- The `Manage` link should remain visually distinct as the path to deeper configuration.

## 7. Technical Considerations

- The virtual-channels page will need additional load data for current source-channel associations per virtual channel.
- Inline add/remove behavior will likely require Svelte-enhanced form handling or equivalent client-side update flow to avoid full page reloads.
- Backend actions should continue enforcing association validity and uniqueness constraints.
- The same source channel may still be associated with multiple virtual channels.
- The existing dedicated manage page remains the deeper management surface and should not be regressed by this feature.

## 8. Success Metrics

- An admin can identify the assigned source channels for a virtual channel from the virtual-channels page alone.
- An admin can add an already imported source channel to a virtual channel without navigating away.
- An admin can remove an association inline with confirmation.
- Inline add/remove operations update the visible page state without a full page reload.
- The admin still has access to the `Manage` link for deeper follow-up work.

## 9. Clarifications Applied

- Associated source channels should always be visible on the virtual-channels page.
- The add dropdown should exclude source channels already associated with the current virtual channel.
- Inline add/remove actions should update the page state in place without a full reload.
- The backend should still process the add/remove requests; the client should update after success.
- The existing `Manage` link should remain for now.
- The standalone assignments page should remain for now and be reviewed later.

## 10. Open Questions

- Should inline add/remove failures use inline error text, toast-style messaging, or an existing admin feedback pattern?
- How dense should the default inline association layout be when a virtual channel has many attached source channels?
- Should the inline add control always be visible, or should it collapse into a compact reveal affordance if the page becomes too crowded during implementation?
