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

Ad hoc feature commits are also allowed when the user wants to make a focused feature addition without treating it as the main task-completion commit.

Ad hoc feature format:

```text
feat: <feature-tag>-<task id>+ - <description>
```

## Follow-Up Commit Prefixes

The following explicit follow-up prefixes are also allowed when the user is preparing a commit that builds on the most recently completed task rather than representing the main task-completion commit:

- `tidy`
- `style`
- `fix`
- `docs`
- `mgmt`
- `feat`

Follow-up format:

```text
<prefix>: <feature-tag>-<task id>+ - <description>
```

## Process

1. **Identify the Active Feature and Task**
   - Read `/ai-work/00-feature-status.md`
   - Use the active feature and branch as the default and expected source of truth
   - If the user does not provide a task ID, infer it from the active feature task list by finding the most recently completed task that aligns with the current diff
   - If the user explicitly invokes one of the allowed follow-up prefixes, including ad hoc `feat`, use the most recently completed task in the active feature as the default task context unless the user provides a different task ID
   - If the task is ambiguous, stop and ask the user to clarify before proposing a commit

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

## Default Behavior

- If the user says only `run 8`, assume the active feature
- Use the current diff plus the active feature task list to infer the most recently completed task
- If the user says `run 8 tidy`, `run 8 style`, `run 8 fix`, `run 8 docs`, `run 8 mgmt`, or `run 8 feat`, assume the active feature and use the most recently completed task as the `+` context for the commit message
- If there are no changes, do not propose a commit
- If the diff appears to span multiple tasks or unrelated work, surface that clearly and ask the user how to scope the commit

## Non-Active and Completed Feature Behavior

- Do not prepare commits for a paused feature until it has been switched back to active
- Do not prepare new implementation commits for completed features unless the user explicitly asks for an exception

## Final Instructions

1. Do not create the commit until the user explicitly approves the message and scope
2. Always inspect the active feature and current Git branch first
3. Use the active feature by default unless the user is only clarifying scope
4. Prefer a narrow, task-aligned commit over a broad convenience commit
5. Use the exact main-task format `feat: <feature-tag>-<task id> - <description>` for main task-completion commits
6. Use the exact ad hoc feature format `feat: <feature-tag>-<task id>+ - <description>` when the user explicitly requests ad hoc `feat`
7. Use the exact follow-up format `<prefix>: <feature-tag>-<task id>+ - <description>` for `tidy`, `style`, `fix`, `docs`, and `mgmt`
8. Surface unrelated changes clearly instead of silently bundling them
