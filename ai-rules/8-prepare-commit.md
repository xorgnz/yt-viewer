---
version: 1.2.0
timestamp: 2026-03-22 14:03
---
# Rule: Prepare a Task Commit for Approval

## Goal

To guide an AI assistant in preparing a clean commit for a completed task by identifying the intended file set, proposing a commit message, and waiting for user approval before creating the commit.

## When to Use

Use this rule when the user says they have completed implementation for a task and want to commit the work.

## Prerequisites

- `/ai-work/00-feature-status.md` must exist
- A feature must be marked `active`
- The current branch must match the active feature branch
- A task list should exist at `/ai-work/{feature-tag}-tasks.md`
- The relevant task should already be implemented

## Core Principle

The AI must not commit automatically when using this rule. It should:

- inspect the current changes
- determine which files belong to the completed task
- propose a commit message in the required format
- ask the user to approve the commit message and scope

## Required Commit Message Format

```text
feat: <feature-tag>-<task id> - <description>
```

## Process

1. **Identify the Active Feature and Task**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature and branch as the default source of truth
   - Confirm the task ID

2. **Review Task Context**
   - Read `/ai-work/{feature-tag}-tasks.md`
   - Use the task wording as the basis for the description

3. **Inspect Current Git Changes**
   - Review the current Git status
   - Identify only the files related to the completed task
   - Exclude unrelated or unfinished work

4. **Draft the Commit Description**
   - Keep it concise and specific

5. **Propose the Commit**
   - Present the proposed message and file list
   - Wait for explicit user approval

## Non-Active and Completed Feature Behavior

- Do not prepare commits for a paused feature until it has been switched back to active
- Do not prepare new implementation commits for completed features unless the user explicitly asks for an exception

## Final Instructions

1. Do not create the commit until the user explicitly approves the message and scope
2. Always inspect the active feature and current Git branch first
3. Prefer a narrow, task-aligned commit over a broad convenience commit
4. Use the exact prefix format `feat: <feature-tag>-<task id> - <description>`
5. Surface unrelated changes clearly instead of silently bundling them
