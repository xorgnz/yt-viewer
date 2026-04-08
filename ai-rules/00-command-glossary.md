---
version: 1.0.0
timestamp: 2026-04-04 11:15
---
# Rule Command Glossary

## Goal

To provide a short reference for shorthand commands used across the workflow rules.

## Shorthand Commands

### `run 8`

- Uses rule 8 with the active feature as the default context.
- Means: inspect the current diff, identify the best task context, and propose a commit message and file scope.

### `run 8 tidy`

- Uses rule 8 follow-up mode with the `tidy` prefix.
- Means: prepare a follow-up commit proposal using the active feature and the best task match for the diff.

### `run 8 feat`

- Uses rule 8 ad hoc feature mode.
- Means: prepare a `feat: <feature-tag>-<task id>+ - <description>` proposal for a focused feature addition without treating it as the main task-completion commit.

## Usage Notes

- These commands propose or inspect by default unless the underlying rule says an approved variant may execute directly.
- If the scope is ambiguous, the assistant should ask instead of inferring.
- The active feature in `/ai-work/00-feature-status.md` remains the default source of truth unless a rule explicitly allows a planned-feature exception.
