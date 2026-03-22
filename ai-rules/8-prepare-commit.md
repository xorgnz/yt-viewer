---
version: 1.0.0
timestamp: 2026-03-22 13:28
---
# Rule: Prepare a Task Commit for Approval

## Goal

To guide an AI assistant in preparing a clean commit for a completed task by identifying the intended file set, proposing a commit message, and waiting for user approval before creating the commit.

## When to Use

Use this rule when the user says they have completed implementation for a task and want to commit the work, or when they ask the AI to prepare a commit for a specific feature task.

## Prerequisites

- A feature tag must exist
- A task list should exist at `/ai-work/{feature-tag}-tasks.md`
- The relevant task should already be implemented
- Follow the repository guidance in `AGENTS.md`

## Core Principle

The AI must not commit automatically when using this rule. It should:

- inspect the current changes
- determine which files belong to the completed task
- propose a commit message in the required format
- ask the user to approve the commit message and scope

The actual commit should only happen after explicit user approval.

## Required Commit Message Format

```text
feat: <feature-tag>-<task id> - <description>
```

Example:

```text
feat: 01-initial-4.5 - implement watch completion tracking
```

## Process

1. **Identify the Feature and Task**
   - Confirm the feature tag and task ID
   - If the user does not specify them clearly, inspect the relevant task file and ask for clarification when needed
   - Use the task title or sub-task description as the basis for the commit description

2. **Review Task Context**
   - Read `/ai-work/{feature-tag}-tasks.md`
   - Confirm which task or sub-task was completed
   - Check whether the completed work matches the task description

3. **Inspect Current Repository Changes**
   - Review the current Git status
   - Identify which modified, added, deleted, or renamed files appear related to the task
   - Be careful in dirty worktrees and do not assume all changed files belong in the same commit

4. **Separate In-Scope from Out-of-Scope Changes**
   - Include files that directly support the completed task
   - Exclude unrelated user changes, unrelated documentation changes, and unfinished work
   - If the scope is ambiguous, present the uncertainty to the user instead of guessing

5. **Draft the Commit Description**
   - Convert the task wording into a short imperative or descriptive phrase
   - Keep the description concise and specific
   - Avoid vague descriptions such as `misc updates` or `fix stuff`

6. **Propose the Commit**
   - Present:
     - the feature tag
     - the task ID
     - the proposed commit message
     - the list of files intended for the commit
   - Ask the user to approve or adjust the proposal

7. **Wait for Approval**
   - Do not create the commit yet
   - Wait for the user to confirm the message and file scope

## Commit Proposal Format

Use a concise proposal like this:

```markdown
Proposed commit message:
`feat: 01-initial-4.5 - implement watch completion tracking`

Proposed files:
- `src/lib/watch/criteria.ts`
- `src/routes/viewer/watch/[videoId]/+server.ts`
- `src/routes/viewer/watch/[videoId]/+page.svelte`

Approve this message and file set?
```

## Scope Guidance

- Prefer one logical task per commit
- If a task naturally spans code, tests, and small supporting documentation changes, those may be included together
- If multiple unrelated tasks were completed together, propose splitting them into separate commits when practical
- Do not stage or commit unrelated modified files just because they are present in the worktree

## Handling Edge Cases

### Dirty Worktree

- If unrelated files are already modified, call that out explicitly
- Propose a narrowed file list for the current task

### Parent Task vs Sub-Task

- If the completed work corresponds to a sub-task, prefer the sub-task ID
- If several sub-tasks were intentionally completed as one logical unit, explain that and propose a single commit message based on the combined work

### Description Too Long

- Shorten the description while preserving the actual user-facing or developer-facing change

### Non-Feature Work

- If the work is repo maintenance or documentation that does not fit `feat`, note the mismatch and ask whether the user still wants to use the required format

## Output Expectations

When using this rule, the AI should output:

- the proposed commit message
- the proposed file list
- any concerns about unrelated changes or unclear scope
- a direct request for approval

## Example Interaction Flow

```text
User: "I finished task 3.4 for 01-initial. Help me commit it."

AI: [Reviews 01-initial-tasks.md and git status]
AI: "Proposed commit message:
`feat: 01-initial-3.4 - add manual refresh action`

Proposed files:
- `src/routes/admin/channels/+page.svelte`
- `src/routes/admin/channels/+server.ts`

I also see unrelated changes in `src/routes/history/+page.svelte`, so I excluded them.

Approve this message and file set?"
```

## Final Instructions

1. Do not create the commit until the user explicitly approves the message and scope
2. Always inspect the current Git state before proposing a commit
3. Prefer a narrow, task-aligned commit over a broad convenience commit
4. Use the exact message prefix format: `feat: <feature-tag>-<task id> - <description>`
5. Surface unrelated changes clearly instead of silently bundling them
