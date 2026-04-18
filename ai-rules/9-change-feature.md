---
version: 1.5.1
timestamp: 2026-04-05 18:56
---
# Rule: Switch, Activate, Pause, or Close a Feature

## Source of Truth

Use `/ai-work/00-feature-status.md` as the authoritative record for:

- the current active feature
- feature status values

Allowed status values:

- `planned`
- `active`
- `paused`
- `completed`

Also follow the shared feature-state contract in `/ai-work/00-feature-status.md`.

## Scope of This Rule

This rule does **not** independently create new features.

- Feature creation belongs to rule `1-create-feature-tag.md`
- This rule handles working-state changes: `switch`, `activate`, and `close`
- Do not offer standalone `pause` as a primary workflow action; use `switch` to leave a feature paused, or `close` to end active work without selecting a replacement
- If the user says `create and activate`, treat that as a convenience flow:
  1. invoke rule 1 to create the feature tag and feature entry
  2. then continue with activation under this rule

## Core Rules

1. Only one feature may be `active` at a time
2. `paused` means previously active, unfinished, and resumable
3. `planned` means defined but not yet started as the active working feature
4. Completed features are read-only by default
5. Closing a feature should mark it `completed` and clear it as the active feature

## Process

### Inspect

#### Process for Switching to an Existing Feature

1. Read `/ai-work/00-feature-status.md`
2. Identify the requested feature
3. Confirm the feature already exists and is not `completed`
4. If another feature is active, mark that feature `paused`
5. Update `/ai-work/00-feature-status.md` so the selected feature is the only active one

#### Process for Activating a Planned Feature

1. Read `/ai-work/00-feature-status.md`
2. Confirm the feature exists and is marked `planned`
3. Mark the feature as `active`
4. Ensure no other feature remains `active`

#### Process for Create and Activate

Use this only when the user explicitly asks for both actions together.

1. Invoke rule `1-create-feature-tag.md`
2. Confirm the new feature now exists in `/ai-work/00-feature-status.md` as `planned`
3. Continue with the activation flow in this rule

#### Process for Closing a Feature

Use this when the user explicitly asks to close the feature.

1. Read `/ai-work/00-feature-status.md`
2. Confirm which feature is being closed
3. Mark the feature as `completed`
4. Record the completion date
5. Clear it as the active feature if it was active

### Propose

1. If the user's request could reasonably mean more than one state change, do not infer
2. Present the valid options briefly and ask the user to choose before changing feature state
3. Explain the expected feature-state result before executing when the flow is not obvious from the request

### Execute and Report

1. Apply the selected feature-state changes in the required order
2. Report the previous active feature, the new active feature if any, and whether any feature was paused or completed

## Output Expectations

When using this rule, report:

- the previous active feature
- the new active feature, if any
- whether a prior feature was paused
- whether a feature was marked completed

## Example Interaction Flow

```text
User: "Switch me to feature 02-history"

AI: [Reads 00-feature-status.md]
AI: [Marks the prior active feature paused]
AI: [Marks 02-history active]
AI: "Feature `01-initial` is now paused. Active feature is now `02-history`."
```

```text
User: "Create and activate feature 03-user-auth"

AI: [Invokes rule 1 to create the feature]
AI: [Marks 03-user-auth active]
AI: "Active feature is now `03-user-auth`."
```

```text
User: "Close feature 01-initial"

AI: [Reads 00-feature-status.md]
AI: [Marks 01-initial completed]
AI: "Feature `01-initial` is now marked completed. No feature is currently active."
```

```text
User: "Close feature 02-vchannel-mgmt"

AI: [Reads 00-feature-status.md]
AI: [Marks 02-vchannel-mgmt completed]
AI: "Feature `02-vchannel-mgmt` is now completed. No feature is currently active until you activate or switch to another feature."
```
