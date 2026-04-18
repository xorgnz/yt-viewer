---
version: 1.1.0
timestamp: 2026-04-17 09:20
---
# Rule Command Glossary

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

## Approval Discipline

- Only ask for explicit `Approve this? Y/N.` confirmation in the rule-defined approval gates:
  - rule 1 before recording a new feature entry
  - rule 2 before writing a scope file
  - rule 3 before writing a PRD file
  - rule 4 before documenting a new shared tech-stack decision
  - rule 6 before starting task execution when explicit task approval is not already present
  - rule 8 before creating a commit, unless the same command includes `approve` or `approved`
- Rule 7 command selection is a choice prompt, not an approval gate.
- Do not ask additional approval prompts for normal reads/edits inside the agent's standard workspace permissions.
- Environment/tool permission prompts are separate from workflow approval gates and should be requested only when a command cannot run under normal agent permissions.
- Every approval prompt must name the exact action being approved (for example, target file, commit message, and scoped file set). Do not ask vague approval questions.
