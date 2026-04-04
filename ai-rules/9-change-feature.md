---
version: 1.2.1
timestamp: 2026-04-04 10:00
---
# Rule: Switch, Activate, Pause, or Close a Feature

## Goal

To guide an AI assistant in changing the current working feature by updating Git branches and `/ai-work/00-feature-status.md`, while enforcing the rule that only one feature may be active at a time.

## When to Use

Use this rule when the user wants to:

- switch to another existing feature
- activate a planned feature
- pause the current feature explicitly
- close a feature after it has been merged or otherwise completed
- use a convenience command to create and activate a feature in one flow

## Source of Truth

Use `/ai-work/00-feature-status.md` as the authoritative record for:

- the current active feature
- the branch for each feature
- feature status values

Allowed status values:

- `planned`
- `active`
- `paused`
- `completed`

## Scope of This Rule

This rule does **not** independently create new features.

- Feature creation belongs to rule `1-create-feature-tag.md`
- This rule handles working-state changes: `switch`, `activate`, `pause`, and `close`
- If the user says `create and activate`, treat that as a convenience flow:
  1. invoke rule 1 to create the feature tag and feature entry
  2. then continue with activation under this rule

## Core Rules

1. Only one feature may be `active` at a time
2. The active feature must match the current working branch
3. `paused` means previously active, unfinished, and resumable
4. `planned` means defined but not yet started as the active working feature
5. Completed features are read-only by default
6. Closing a feature should mark it `completed` and clear it as the active feature

## Process for Switching to an Existing Feature

1. Read `/ai-work/00-feature-status.md`
2. Identify the requested feature and its branch
3. Confirm the feature already exists and is not `completed`
4. If another feature is active, mark that feature `paused`
5. Switch Git to the requested branch
6. Update `/ai-work/00-feature-status.md` so the selected feature is the only active one

## Process for Activating a Planned Feature

1. Read `/ai-work/00-feature-status.md`
2. Confirm the feature exists and is marked `planned`
3. Create the branch `feature/{feature-tag}` if it does not already exist
4. Switch to that branch
5. Mark the feature as `active`
6. Ensure no other feature remains `active`

## Process for Pausing the Current Feature

Use this when the user explicitly asks to pause work without activating a different feature immediately.

1. Read `/ai-work/00-feature-status.md`
2. Confirm which feature is currently active
3. Switch Git to a non-feature branch such as `main` before updating feature status
4. Mark that feature as `paused`
5. Clear the current active feature fields if no other feature is being activated in the same flow

## Process for Create and Activate

Use this only when the user explicitly asks for both actions together.

1. Invoke rule `1-create-feature-tag.md`
2. Confirm the new feature now exists in `/ai-work/00-feature-status.md` as `planned`
3. Continue with the activation flow in this rule

## Process for Closing a Feature

Use this when the user explicitly asks to close the feature or branch.

1. Read `/ai-work/00-feature-status.md`
2. Confirm which feature is being closed
3. Switch Git to a non-feature branch such as `main` before updating feature status if the feature being closed is currently active
4. Mark the feature as `completed`
5. Record the completion date
6. Clear it as the active feature if it was active

## Branch Safety

- Do not discard local changes silently
- If switching branches is blocked by local modifications, stop and tell the user what must be resolved before feature status can be changed
- Do not delete branches unless the user explicitly requests deletion

## Output Expectations

When using this rule, report:

- the previous active feature
- the new active feature, if any
- whether a prior feature was paused
- the branch switched to or created
- whether a feature was marked completed

## Example Interaction Flow

```text
User: "Switch me to feature 02-history"

AI: [Reads 00-feature-status.md]
AI: [Checks out feature/02-history]
AI: [Marks the prior active feature paused]
AI: [Marks 02-history active]
AI: "Feature `01-initial` is now paused. Active feature is now `02-history` on branch `feature/02-history`."
```

```text
User: "Pause the current feature"

AI: [Reads 00-feature-status.md]
AI: [Checks out main]
AI: [Marks the current feature paused]
AI: "Feature `01-initial` is now paused. No feature is currently active."
```

```text
User: "Create and activate feature 03-user-auth"

AI: [Invokes rule 1 to create the feature]
AI: [Creates or checks out feature/03-user-auth]
AI: [Marks 03-user-auth active]
AI: "Active feature is now `03-user-auth` on branch `feature/03-user-auth`."
```

```text
User: "Close feature 01-initial"

AI: [Reads 00-feature-status.md]
AI: [Checks out main]
AI: [Marks 01-initial completed]
AI: "Feature `01-initial` is now marked completed. No feature is currently active."
```

## Final Instructions

1. `/ai-work/00-feature-status.md` is the feature-state source of truth
2. Only one feature may be active at a time
3. Always align branch state and feature state
4. Treat paused features as resumable but inactive
5. Treat completed features as read-only by default
6. Only pause or close a feature when the user explicitly asks, or when pause is part of a switch
