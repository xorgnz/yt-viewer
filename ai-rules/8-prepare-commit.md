---
version: 1.3.2
timestamp: 2026-03-25 15:34
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

The AI must not commit automatically when using this rule unless the user explicitly includes approval in the same request. It should:

- inspect the current changes
- determine which files belong to the completed task
- propose a commit message in the required format
- ask the user to approve the commit message and scope unless approval was already included in the command

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
- `tweak`

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
   - For follow-up prefixes and ad hoc `feat`, treat the candidate commit message as a summary of the full scoped diff since `HEAD`, not just the most recent user request in the conversation
   - If multiple related changes have accumulated since the last commit, make the description reflect the combined result at the chosen scope

4. **Draft the Commit Description**
   - Keep it concise and specific
   - For follow-up prefixes and ad hoc `feat`, summarize all known in-scope changes since the last commit that will be included in the proposed commit

5. **Propose the Commit**
   - Present the proposed message and file list
   - Wait for explicit user approval unless the user already provided preapproval in the same command

6. **Create the Commit When Preapproved**
   - If the user's rule invocation already includes `approve` or `approved`, treat that as approval for the proposed task-aligned commit
   - Still inspect the active feature, task context, and changed files first
   - If the diff is clearly scoped to one task, create the commit after preparing the message and file scope without asking a second approval question
   - If the diff is ambiguous, spans multiple tasks, or includes unrelated work, stop and ask for clarification instead of using preapproval blindly

## Default Behavior

- If the user says only `run 8`, assume the active feature
- If the user says `run 8 approve`, `run rule 8 approve`, `run 8 approved`, or equivalent, treat that as preapproval for a clean task-aligned commit
- Use the current diff plus the active feature task list to infer the most recently completed task
- If the user says `run 8 tidy`, `run 8 style`, `run 8 fix`, `run 8 docs`, `run 8 mgmt`, `run 8 feat`, or `run 8 tweak`, assume the active feature and use the most recently completed task as the `+` context for the commit message
- For `run 8 tidy`, `run 8 style`, `run 8 fix`, `run 8 docs`, `run 8 mgmt`, `run 8 feat`, and `run 8 tweak`, write the description to match the full scoped set of uncommitted changes since the last commit
- If there are no changes, do not propose a commit
- If the diff appears to span multiple tasks or unrelated work, surface that clearly and ask the user how to scope the commit

## PowerShell Command Guidance

- In this repository, commit preparation commands must be PowerShell-compatible
- Do not chain `git add` and `git commit` with `&&`
- Do not issue staging and commit commands simultaneously through parallel tool calls
- Run staging, commit creation, and post-commit verification as separate commands when using the shell

## Non-Active and Completed Feature Behavior

- Do not prepare commits for a paused feature until it has been switched back to active
- Do not prepare new implementation commits for completed features unless the user explicitly asks for an exception

## Final Instructions

1. Do not create the commit until the user explicitly approves the message and scope, unless the same command already included `approve` or `approved`
2. Always inspect the active feature and current Git branch first
3. Use the active feature by default unless the user is only clarifying scope
4. Prefer a narrow, task-aligned commit over a broad convenience commit
5. Use the exact main-task format `feat: <feature-tag>-<task id> - <description>` for main task-completion commits
6. Use the exact ad hoc feature format `feat: <feature-tag>-<task id>+ - <description>` when the user explicitly requests ad hoc `feat`
7. Use the exact follow-up format `<prefix>: <feature-tag>-<task id>+ - <description>` for `tidy`, `style`, `fix`, `docs`, `mgmt`, `feat`, and `tweak`
8. Surface unrelated changes clearly instead of silently bundling them
9. For follow-up prefixes and ad hoc `feat`, including `tweak`, ensure the description summarizes all known in-scope changes included since `HEAD`, not only the latest tweak discussed
