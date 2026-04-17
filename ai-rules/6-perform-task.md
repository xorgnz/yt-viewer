---
version: 1.2.5
timestamp: 2026-04-17 09:24
---
# Rule: Performing a Task for the Active Feature

## Goal

To guide an AI assistant in executing development tasks from structured task lists while maintaining proper environment configuration, approval protocols, any required branch alignment, and accurate progress tracking.

## Prerequisites

- `/ai-work/00-workflow-config.md` should exist
- `/ai-work/00-feature-status.md` must exist
- A feature must be marked `active`
- A task list must exist at `/ai-work/{feature-tag}-tasks.md`
- `/ai-work/00-master-techstack.md` is the shared technology source of truth if it exists

## Active Feature Protocol

### Source of Truth

- Use `/ai-work/00-feature-status.md` as the source of truth for:
  - the active feature
  - the active branch
  - whether a feature is planned, active, paused, or completed

- Use `/ai-work/00-workflow-config.md` as the source of truth for whether `branch_mode` is `required` or `optional`

- If `/ai-work/00-workflow-config.md` is missing, ask the user whether `branch_mode` should be `required` or `optional`, write the file, and then continue

### Non-Active Features

- If no feature is currently active, do not perform implementation work and tell the user to activate or switch to a feature first
- Treat `paused` features as resumable but not currently editable
- Tell the user to switch features first by using the feature-change workflow if they want to resume a paused feature
- Treat completed features as read-only by default
- Refuse to modify scope, PRD, tasks, or implementation for a completed feature unless the user explicitly asks for an exception

### Branch Alignment

- If `branch_mode: required` and the current branch does not match the active feature branch, do not proceed with implementation
- If `branch_mode: required`, tell the user to switch features first by using the feature-change workflow
- If `branch_mode: optional`, do not block implementation solely because the current branch does not match the active feature branch
- If `branch_mode: optional`, treat branch use as advisory unless the user explicitly asks to work on a specific branch

## Task Selection Process

Use the active feature from `/ai-work/00-feature-status.md` as the default and expected implementation target.

1. **With Task Number**
   - When given a specific task number, begin work on that task for the active feature after confirming the request is explicit
   - Treat an explicit execution request for that task as approval to start it; do not ask a second generic approval question unless scope remains ambiguous

2. **Without Task Number**
   - Review the active feature task list
   - Identify the next unchecked task
   - Present it to the user
   - State the exact task id and title being approved
   - Ask `Approve this? Y/N.` before proceeding

3. **If the User Also Names a Feature**
   - Treat the active feature as the source of truth
   - If the named feature matches the active feature, proceed normally
   - If the named feature does not match the active feature, do not proceed and tell the user to switch features first by using the feature-change workflow

## Task Execution Rules

- Never start work on any task without explicit user approval
- Complete only the approved task
- Do not silently move to the next task
- Do not ask extra approval prompts beyond task-start approval; routine in-task edits under normal workspace permissions do not require additional approval requests
- Before implementation, read `/ai-work/00-master-techstack.md` when it exists and apply any relevant shared technology decisions alongside the PRD and task list

## Progress Tracking

As each task or sub-task is completed:

1. Update `/ai-work/{feature-tag}-tasks.md` immediately
2. Change `- [ ]` to `- [x]`
3. If the last sub-task under a task is completed and the task itself is satisfied, also check off the parent task
4. Save the file after each update

## General Working Principles

1. Prefer editing existing files over creating new ones unless creation is required
2. Use the PRD as the implementation-facing feature document and the master tech stack as the shared technology baseline when it exists
3. Run validation as appropriate using the testing rule
4. Ask clarifying questions if task requirements are ambiguous
5. Do not expand scope without approval
6. Do not run long-running application servers unless explicitly asked
7. Follow `AGENTS.md` for command, style, and environment conventions

## Final Instructions

1. Never start tasks without explicit user approval
2. Always use the active feature in `/ai-work/00-feature-status.md`
3. Use `/ai-work/00-workflow-config.md` as the source of truth for branch workflow mode
4. A feature argument is optional and must not override the active feature
5. If no feature is active, refuse implementation work until the user activates or switches to a feature
6. Treat paused features as inactive until switched back in
7. Refuse routine edits to completed features
8. Read `/ai-work/00-master-techstack.md` before implementation when that file exists
9. Always update task checkboxes immediately upon completion
10. Check off the parent task when its last sub-task is done and the task itself is actually complete
