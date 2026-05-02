---
version: 1.5.0
timestamp: 2026-04-30 00:00
---
# Rule: Performing a Task for the Active Feature

## Prerequisites

- `/ai-work/00-feature-status.md` must exist
- A feature must be marked `active`
- A task list must exist at `/ai-work/{feature-tag}-tasks.md`

## Active Feature Protocol

### Source of Truth

- Use `/ai-work/00-feature-status.md` as the source of truth for:
  - the active feature
  - whether a feature is future, planned, active, paused, completed, or archived

### Non-Active Features

- If no feature is currently active, do not perform implementation work and tell the user to activate or switch to a feature first
- Treat `future` features as backlog notes, not currently executable work
- Treat `paused` features as resumable but not currently editable
- Tell the user to switch features first by using the feature-change workflow if they want to resume a paused feature
- Treat completed and archived features as read-only by default
- Refuse to modify scope, PRD, tasks, or implementation for a completed or archived feature unless the user explicitly asks for an exception

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
- Before implementation, if `/ai-work/00-architecture.md` exists, read it once as part of the initial task context
- After that initial read, do not keep re-reading `/ai-work/00-architecture.md` during normal task execution unless the user explicitly asks for that or the flow of work clearly requires revisiting the document
- If implementation materially changes architecture, clarifies a structural decision, or reveals that the architecture record is stale, update `/ai-work/00-architecture.md` as part of the task work

## Progress Tracking

As each task or sub-task is completed:

1. Update `/ai-work/{feature-tag}-tasks.md` immediately
2. Change `- [ ]` to `- [x]`
3. If the last sub-task under a task is completed and the task itself is satisfied, also check off the parent task
4. Save the file after each update

## General Working Principles

1. Prefer editing existing files over creating new ones unless creation is required
2. Use the PRD as the implementation-facing feature document, the master tech stack as the shared technology baseline when it exists, and the architecture document as the shared structural baseline when it exists
3. Run validation as appropriate using the testing rule
4. Ask clarifying questions if task requirements are ambiguous
5. Do not expand scope without approval
6. Do not run long-running application servers unless explicitly asked
7. Follow `AGENTS.md` for command, style, and environment conventions

