---
version: 1.0.0
timestamp: 2026-04-06 11:01
---
# Workflow Shortcut: 6-7-8 Subtask Flow

## Goal

To define a reusable shorthand for processing the subtasks of a parent task one at a time using the existing downstream task execution, validation, and commit rules.

## Shortcut Phrase

### `Run the 6-7-8 subtask flow for task <task id>`

- This is a workflow shortcut, not a new standalone rule.
- It applies to the named parent task in the active feature.
- It means:
  1. take the next subtask under the specified parent task
  2. run rule 6 for that subtask
  3. run rule 7 using the default option
  4. run rule 8 with approval included
  5. only then move to the next subtask

## Equivalent Long Form

The shortcut expands to the same intent as:

`For each subtask, run rule 6, rule 7 default, and rule 8 approve in order before moving to the next one.`

## Usage Notes

- Do not skip required confirmations or safeguards defined by rules 6, 7, or 8.
- If task or subtask scope is ambiguous, ask instead of inferring.
- If validation or commit scope becomes ambiguous for a subtask, stop and resolve that ambiguity before continuing.
- Treat the parent task as complete only when its subtasks are complete and rule 6's completion-tracking guidance is satisfied.
