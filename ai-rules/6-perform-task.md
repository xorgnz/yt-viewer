---
version: 1.2.0
timestamp: 2026-03-22 14:03
---
# Rule: Performing a Task for the Active Feature

## Goal

To guide an AI assistant in executing development tasks from structured task lists while maintaining proper environment configuration, approval protocols, branch alignment, and accurate progress tracking.

## Prerequisites

- `/ai-work/00-feature-status.md` must exist
- A feature must be marked `active`
- The current Git branch should match the active feature branch
- A task list must exist at `/ai-work/{feature-tag}-tasks.md`

## Active Feature Protocol

### Source of Truth

- Use `/ai-work/00-feature-status.md` as the source of truth for:
  - the active feature
  - the active branch
  - whether a feature is planned, active, paused, or completed

### Non-Active Features

- Treat `paused` features as resumable but not currently editable
- Tell the user to switch features first by using the feature-change workflow if they want to resume a paused feature
- Treat completed features as read-only by default
- Refuse to modify scope, PRD, tasks, or implementation for a completed feature unless the user explicitly asks for an exception

### Branch Alignment

- If the current branch does not match the active feature branch, do not proceed with implementation
- Tell the user to switch features first by using the feature-change workflow

## Task Selection Process

Use the active feature from `/ai-work/00-feature-status.md` as the default and expected implementation target.

1. **With Task Number**
   - When given a specific task number, begin work on that task for the active feature after confirming the request is explicit

2. **Without Task Number**
   - Review the active feature task list
   - Identify the next unchecked task
   - Present it to the user
   - Wait for explicit approval before proceeding

3. **If the User Also Names a Feature**
   - Treat the active feature as the source of truth
   - If the named feature matches the active feature, proceed normally
   - If the named feature does not match the active feature, do not proceed and tell the user to switch features first by using the feature-change workflow

## Task Execution Rules

- Never start work on any task without explicit user approval
- Complete only the approved task
- Do not silently move to the next task

## Progress Tracking

As each task or sub-task is completed:

1. Update `/ai-work/{feature-tag}-tasks.md` immediately
2. Change `- [ ]` to `- [x]`
3. Save the file after each update

## General Working Principles

1. Prefer editing existing files over creating new ones unless creation is required
2. Run validation as appropriate using the testing rule
3. Ask clarifying questions if task requirements are ambiguous
4. Do not expand scope without approval
5. Do not run long-running application servers unless explicitly asked
6. Follow `AGENTS.md` for command, style, and environment conventions

## Final Instructions

1. Never start tasks without explicit user approval
2. Always use the active feature in `/ai-work/00-feature-status.md`
3. A feature argument is optional and must not override the active feature
4. Treat paused features as inactive until switched back in
5. Refuse routine edits to completed features
6. Always update task checkboxes immediately upon completion
