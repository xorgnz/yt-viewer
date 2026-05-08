---
version: 1.12.0
timestamp: 2026-05-02 00:00
---
# Rule: Switch, Activate, Pause, Close, or Archive a Feature

## Source of Truth

Use `/ai-work/00-feature-status.md` as the authoritative record for:

- the current active feature
- feature status values

Use `/ai-work/archive/` as the historical location for archived feature planning documents.

Allowed status values:

- `planned`
- `future`
- `active`
- `paused`
- `completed`
- `archived`

Also follow the shared feature-state contract in `/ai-work/00-feature-status.md`.

When maintaining the feature list in `/ai-work/00-feature-status.md`, use colored spot emojis to make feature states easy to scan.

Suggested markers:

- `planned` -> `🟡`
- `future` -> `🟣`
- `active` -> `🟠`
- `paused` -> `🔴`
- `completed` -> `🟢`
- `archived` -> `🔵`

Approximate colors are acceptable. Keep the meaning consistent within the file.

Keep the feature list in `/ai-work/00-feature-status.md` sorted in this order:

1. Normal numeric feature tags first, sorted by feature tag
2. Future feature tags last, sorted by feature tag

Do not reorder entries by status. The stable ordering should come from the tag groups above.

## Scope of This Rule

This rule does **not** independently create new features.

- Feature creation belongs to rule `01-create-feature-tag.md`
- This rule handles feature-state changes: `switch`, `activate`, `promote future`, `close`, and `archive`
- Archiving is a state change that also moves the archived feature's planning documents
- Future features use `fNN-` tags and represent work that may be pursued eventually but is not ready for normal planning or execution
- Do not offer standalone `pause` as a primary workflow action; use `switch` to leave a feature paused, or `close` to end active work without selecting a replacement
- If the user says `create and activate`, treat that as a convenience flow:
  1. invoke rule 1 to create the feature tag and feature entry
  2. then continue with activation under this rule

## Core Rules

1. Only one feature may be `active` at a time
2. `future` means tagged as `fNN-{identifier}`, optional to pursue, and not ready for normal planning or execution
3. `paused` means previously active, unfinished, and resumable
4. `planned` means normal queued work that is defined but not yet started
5. Completed and archived features are read-only by default
6. Closing a feature should mark it `completed` and clear it as the active feature
7. Archiving a feature should mark it `archived`, clear it as the active feature, and move its feature-scoped planning documents to `/ai-work/archive/`
8. Global planning records such as `/ai-work/00-feature-status.md` and `/ai-work/00-master-techstack.md` must remain in `/ai-work/`
9. Future features should not be used as planning constraints, dependencies, or prompts for other features unless the user explicitly asks to account for a specific future feature

## Process

### Inspect

#### Process for Switching to an Existing Feature

1. Read `/ai-work/00-feature-status.md`
2. Identify the requested feature
3. Confirm the feature already exists and is not `future`, `completed`, or `archived`
4. If another feature is active, mark that feature `paused`
5. Update `/ai-work/00-feature-status.md` so the selected feature is the only active one

#### Process for Activating a Planned Feature

1. Read `/ai-work/00-feature-status.md`
2. Confirm the feature exists and is marked `planned`
3. Mark the feature as `active`
4. Ensure no other feature remains `active`

#### Process for Promoting a Future Feature to Planned

Use this only when the user explicitly asks to promote a future feature into normal planning.

1. Read `/ai-work/00-feature-status.md`
2. Confirm the feature exists and is marked `future`
3. Confirm the feature tag uses the `fNN-` future-feature format
4. Determine the next numeric feature sequence using normal feature tags only
5. Identify existing `/ai-work/fNN-{identifier}-*.md` planning documents for that future feature
6. Determine the destination filenames using the new numeric feature tag
7. If any destination file already exists, stop before changing status or moving files and ask the user how to resolve the conflict
8. Rename the identified planning documents to use the new numeric feature tag
9. Update `/ai-work/00-feature-status.md` so the feature uses the new numeric tag and is marked `planned`

#### Process for Create and Activate

Use this only when the user explicitly asks for both actions together.

1. Invoke rule `01-create-feature-tag.md`
2. Confirm the new feature now exists in `/ai-work/00-feature-status.md` as `planned`
3. Continue with the activation flow in this rule

#### Process for Closing a Feature

Use this when the user explicitly asks to close the feature.

1. Read `/ai-work/00-feature-status.md`
2. Confirm which feature is being closed
3. Mark the feature as `completed`
4. Record the completion date
5. Clear it as the active feature if it was active

#### Process for Archiving a Feature

Use this when the user explicitly asks to archive a feature.

1. Read `/ai-work/00-feature-status.md`
2. Confirm which feature is being archived
3. Confirm the feature exists and is not already `archived`
4. Identify existing feature-scoped planning documents matching `/ai-work/{feature-tag}-*.md`
   - This includes expected files such as `/ai-work/{feature-tag}-scope.md`, `/ai-work/{feature-tag}-prd.md`, and `/ai-work/{feature-tag}-tasks.md`
   - Also include additional feature-scoped planning notes or supporting documents that use the same `{feature-tag}-*.md` naming pattern
   - Do not include global files such as `/ai-work/00-feature-status.md` or `/ai-work/00-master-techstack.md`
5. Ensure `/ai-work/archive/` exists
6. If an archive destination already exists for any file, stop before changing status or moving files and ask the user how to resolve the conflict
7. Mark the feature as `archived`
8. Record the archive date
9. Clear it as the active feature if it was active
10. Move the identified feature-scoped planning documents to `/ai-work/archive/`
11. If no matching planning documents exist, report that the feature was archived and no file move was needed

### Propose

1. If the user's request could reasonably mean more than one state change, do not infer
2. Present the valid options briefly and ask the user to choose before changing feature state
3. Explain the expected feature-state result before executing when the flow is not obvious from the request
4. When promoting a future feature, report the proposed numeric feature tag and any planning document renames before changing status or moving files
5. When archiving a feature, report which planning documents will be moved before changing status or moving files

### Execute and Report

1. Apply the selected feature-state changes in the required order
2. Re-sort `/ai-work/00-feature-status.md` after the change so numeric feature tags remain first and future feature tags remain last
3. Report the previous active feature, the new active feature if any, whether any feature was paused, promoted, completed, or archived, and which files were moved or renamed

## Output Expectations

When using this rule, report:

- the previous active feature
- the new active feature, if any
- whether a prior feature was paused
- whether a future feature was promoted to planned
- whether a feature was marked completed
- whether a feature was marked archived
- any feature-scoped planning documents moved to `/ai-work/archive/`
- any future feature planning documents renamed to a numeric feature tag

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
User: "Promote future feature f01-analytics-ideas to planned"

AI: [Reads 00-feature-status.md]
AI: [Determines the next numeric feature tag]
AI: [Renames f01-analytics-ideas planning documents to the numeric feature tag]
AI: [Marks the feature planned under the numeric feature tag]
AI: "Feature `f01-analytics-ideas` is now planned as `04-analytics-ideas`."
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

```text
User: "Archive feature 02-vchannel-mgmt"

AI: [Reads 00-feature-status.md]
AI: [Marks 02-vchannel-mgmt archived]
AI: [Moves 02-vchannel-mgmt planning documents to ai-work/archive/]
AI: "Feature `02-vchannel-mgmt` is now archived. Archived `02-vchannel-mgmt` planning documents to `ai-work/archive/`."
```
