# Feature Status

**Current Feature:** `10-timers`
**Current Branch:** `feature/10-timers`
**Last Updated:** `2026-05-01`

## Shared Feature-State Contract

This document is the feature-state source of truth for workflow rules that depend on feature status and branch alignment.

### Source of Truth

- Use this file to determine the current active feature and expected branch.
- Use this file to determine whether a feature is `planned`, `active`, `paused`, `future`, or `completed`.
- When a workflow rule references the shared feature-state contract, this section is the contract it should follow.

### Allowed Status Values

- `planned` - Feature tag exists, but the feature has not yet become active on a working branch.
- `active` - The current feature being worked on and the branch that should be checked out.
- `paused` - A previously active feature with resumable work that is not currently the active feature.
- `future` - A backlog feature note that is intentionally not part of the current working queue.
- `completed` - Feature work has been merged or otherwise closed and should be treated as read-only by default.

### Allowed Transitions

- `planned` -> `active`
- `active` -> `paused`
- `active` -> `completed`
- `paused` -> `active`

Additional guidance:

- `planned` may remain non-active while still being used for planning documents when a rule explicitly allows that.
- `future` may remain non-active as backlog planning without affecting the current active feature.
- `completed` features are read-only by default unless the user explicitly asks for an exception.
- `no active feature` is allowed only before the first feature is activated, or after closing the active feature when no replacement feature is activated in the same flow.
- `paused` is the status left behind when an unfinished active feature is replaced by a different active feature.

### Branch Alignment

- Exactly one feature may be `active` at a time.
- The active feature must match the currently checked out branch.
- If no feature is active, the repository may still be checked out on the previously active feature branch, but that branch should be treated as inactive until another feature is activated or switched in.
- Feature status must not be updated if branch switching is blocked by local changes.

### Completion Metadata

- A completed feature should include a completion date in the `Completed` column.
- The `Current Feature` and `Current Branch` fields should be cleared or updated to match the new active state after completion or switch flows.

## Status Values

- `planned` - Feature tag exists, but the feature has not yet become active on a working branch
- `active` - The current feature being worked on and the branch that should be checked out
- `paused` - A previously active feature with resumable work that is not currently the active feature
- `future` - A backlog feature note that is intentionally not part of the current working queue
- `completed` - Feature work has been merged or otherwise closed and should be treated as read-only by default

## Features

| Tag | Branch | Status | Created | Completed | Notes |
| --- | --- | --- | --- | --- | --- |
| `01-initial` | `feature/01-initial` | `completed` | `2026-02-17` | `2026-03-23` | Initial YouTube viewer and tracker feature |
| `02-vchannel-mgmt` | `feature/02-vchannel-mgmt` | `completed` | `2026-03-23` | `2026-04-04` | Advanced admin UI for virtual channel source associations and video selection |
| `03-inline-assign` | `feature/03-inline-assign` | `completed` | `2026-04-04` | `2026-04-06` | Inline source-channel assignment controls on the virtual channels admin page |
| `04-watch-history` | `feature/04-watch-history` | `completed` | `2026-04-06` | `2026-04-07` | Decouple watch history from watched flags and track playback sessions with elapsed watch time |
| `05-db-migrations` | `feature/05-db-migrations` | `completed` | `2026-04-07` | `2026-04-10` | Forward-only database migration infrastructure for evolving local app data safely across releases |
| `06-video-select` | `feature/06-video-select` | `completed` | `2026-04-08` | `2026-04-10` | Multi-select video actions in the viewer using range and additive selection |
| `07-refactoring` | `feature/07-refactoring` | `completed` | `2026-04-10` | `2026-04-17` | Repository refactoring work after the migration feature completion |
| `08-online-deploy` | `feature/08-online-deploy` | `completed` | `2026-04-17` | `2026-04-19` | New block of work for deployment online |
| `09-stable-db-ids` | `feature/09-stable-db-ids` | `paused` | `2026-04-19` | | Refactor database relationships away from brittle generated serial row IDs |
| `10-timers` | `feature/10-timers` | `active` | `2026-04-28` | | Add playback timers to cap how long channels can play within a defined period |
| `11-viewer-structure-refactor` | `feature/11-viewer-structure-refactor` | `planned` | `2026-05-02` | | Refactor the viewer-layer structure into clearer class-based boundaries with stronger module delineation |
| `xx-rec-modes` |  | `future` | `2026-04-28` | | Add recommendation modes to control how channel content is selected or prioritized |
| `xx-shorts-mgmt` |  | `future` | `2026-04-28` | | Identify YouTube Shorts from duration and API data, allow manual overrides, and support Shorts-aware filtering |
| `xx-channel-mgmt` |  | `future` | `2026-04-28` | | Add channel management UI for aggregate review, video list browsing, and channel tracking tools |
| `xx-video-channels` |  | `future` | `2026-04-30` | | Virtual channels built from an arbitrary list of videos rather than full source channels |
