# Feature Status

**Current Feature:** `02-vchannel-mgmt`
**Current Branch:** `feature/02-vchannel-mgmt`
**Last Updated:** `2026-03-23`

## Shared Feature-State Contract

This document is the feature-state source of truth for workflow rules that depend on feature status and branch alignment.

### Source of Truth

- Use this file to determine the current active feature and expected branch.
- Use this file to determine whether a feature is `planned`, `active`, `paused`, or `completed`.
- When a workflow rule references the shared feature-state contract, this section is the contract it should follow.

### Allowed Status Values

- `planned` - Feature tag exists, but the feature has not yet become active on a working branch.
- `active` - The current feature being worked on and the branch that should be checked out.
- `paused` - A previously active feature with resumable work that is not currently the active feature.
- `completed` - Feature work has been merged or otherwise closed and should be treated as read-only by default.

### Allowed Transitions

- `planned` -> `active`
- `active` -> `paused`
- `active` -> `completed`
- `paused` -> `active`

Additional guidance:

- `planned` may remain non-active while still being used for planning documents when a rule explicitly allows that.
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
- `completed` - Feature work has been merged or otherwise closed and should be treated as read-only by default

## Features

| Tag | Branch | Status | Created | Completed | Notes |
| --- | --- | --- | --- | --- | --- |
| `01-initial` | `feature/01-initial` | `completed` | `2026-02-17` | `2026-03-23` | Initial YouTube viewer and tracker feature |
| `02-vchannel-mgmt` | `feature/02-vchannel-mgmt` | `active` | `2026-03-23` |  | Advanced admin UI for virtual channel source associations and video selection |
