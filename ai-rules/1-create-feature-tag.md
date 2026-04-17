---
version: 1.2.3
timestamp: 2026-04-17 09:22
---
# Rule: Creating a Feature Tag

## Goal

To guide an AI assistant in creating a unique, descriptive feature tag that will be used to organize all documentation, optional branch naming, and implementation artifacts for a feature throughout its lifecycle.

## When to Use

Use this rule before creating scope, PRD, tasks, or implementation work for a new feature.

## Single-Feature Workflow

This project supports only one active feature at a time.

- The active feature must be tracked in `/ai-work/00-feature-status.md`
- Branch requirements are controlled by `/ai-work/00-workflow-config.md`
- Other unfinished features may exist in a `paused` state, but they are not the current working feature
- If another feature is already active, do not create a new working feature until the user explicitly switches or closes the current one using the feature-change workflow

## Workflow Config

Use `/ai-work/00-workflow-config.md` as the source of truth for:

- `branch_mode: required`
- `branch_mode: optional`

If the file is missing, ask the user which mode to use, write the file, and then continue.

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
   - Read `/ai-work/00-workflow-config.md` if it exists
   - If it does not exist, ask whether `branch_mode` should be `required` or `optional`, then write `/ai-work/00-workflow-config.md`
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
   - Branch creation also happens through the feature-change rule when `branch_mode: required`

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

If `branch_mode: required` or the user otherwise chooses to use a feature branch, the branch should be:

- `feature/{feature-tag}`

## Output

- **Format:** Plain text
- **Example:** `03-user-auth`

## Final Instructions

1. Offer feature-tag creation only when no valid target feature already exists for the requested scope, PRD, or task work
2. Only one feature may be active at a time
3. Use `/ai-work/00-feature-status.md` as the source of truth for feature state
4. Use `/ai-work/00-workflow-config.md` as the source of truth for branch workflow mode
5. Do not activate the feature branch from this rule; use the feature-change rule for that
6. Do not proceed to create the scope document unless explicitly asked
