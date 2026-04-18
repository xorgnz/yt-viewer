---
version: 1.2.3
timestamp: 2026-04-17 09:22
---
# Rule: Creating a Feature Tag

## Single-Feature Workflow

This project supports only one active feature at a time.

- The active feature must be tracked in `/ai-work/00-feature-status.md`
- Other unfinished features may exist in a `paused` state, but they are not the current working feature
- If another feature is already active, do not create a new working feature until the user explicitly switches or closes the current one using the feature-change workflow

## Feature Tag Format

A feature tag consists of two parts:

- **Sequence Number:** 2 digits, such as `01`, `02`, `15`
- **Identifier:** Up to 16 characters, lowercase with hyphens

**Format:** `{NN}-{identifier}`

Examples:

- `01-user-auth`
- `02-payment-gateway`
- `03-dashboard-widget`

## Process

1. **Check Feature Status**
   - Read `/ai-work/00-feature-status.md` if it exists
   - If it shows an active feature, do not create a new working feature without explicit user direction to change or close features first

2. **Determine the Next Sequence Number**
   - Review existing feature-tagged files in `/ai-work`
   - Use the next available number based on all known features, including paused and completed ones

3. **Create the Identifier**
   - Base it on the user's request
   - Keep it short, descriptive, and memorable
   - Use lowercase letters and hyphens only

4. **Validate Uniqueness**
   - Ensure the tag is not already in use in `/ai-work/00-feature-status.md` or existing feature files

5. **Present the Proposed Tag**
   - Show the proposed feature tag and expected related files
   - Make the approval target explicit: approving records the new feature as `planned` in `/ai-work/00-feature-status.md`
   - Ask `Approve this? Y/N.` before recording it anywhere

6. **Record the Proposed Feature**
   - After approval, add the feature to `/ai-work/00-feature-status.md`
   - Mark the feature as `planned`
   - Activation happens through the feature-change rule

## Identifier Guidelines

### Good Identifiers

- `user-auth-system` (14 chars, clear purpose)
- `payment-gateway` (15 chars, specific feature)
- `admin-dashboard` (15 chars, clear scope)
- `file-upload` (11 chars, simple and clear)

### Poor Identifiers

- `new-feature` (too vague)
- `update-system` (not descriptive)
- `fix-bugs` (too broad)
- `very-long-identifier-name` (exceeds 16 characters)

## Usage Throughout Workflow

Once created, the feature tag is used to name all related files:

- `{feature-tag}-scope.md`
- `{feature-tag}-prd.md`
- `{feature-tag}-tasks.md`

## Output

- **Format:** Plain text
- **Example:** `03-user-auth`
