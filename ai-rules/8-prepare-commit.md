---
version: 1.9.1
timestamp: 2026-04-08 15:25
---
# Rule: Prepare a Commit for Approval

## Goal

To guide an AI assistant in preparing a clean commit by identifying the intended scope, mapping the requested prefix to the right commit mode, selecting the right context mode, proposing a commit message, and waiting for user approval before creating the commit.

## When to Use

Use this rule when the user wants to prepare a commit for completed work.

This rule may also be used for a planned or not-yet-started tracked feature when the user explicitly wants a management commit for that feature before normal task completion has begun.

## Prerequisites

- `/ai-work/00-workflow-config.md` should exist for commits tied to a tracked feature or task
- `/ai-work/00-feature-status.md` must exist for commits tied to a tracked feature or task
- Main task commits require an `active` tracked feature
- Ad hoc `feat` commits tied to a tracked feature also require an `active` tracked feature
- A task list should exist at `/ai-work/{feature-tag}-tasks.md` when using task-scoped context
- The relevant task should already be implemented when using task-scoped context
- Commits not tied to any tracked feature do not require an active tracked feature or task list
- Follow the shared feature-state contract in `/ai-work/00-feature-status.md`

## Core Principle

The AI must not commit automatically when using this rule unless the user explicitly includes approval in the same request. It should:

- inspect the current changes
- determine whether the commit is task-scoped, tracked-feature-scoped, or repo-scoped
- propose a commit message in the required format
- ask `Approve this? Y/N.` for the commit message and scope unless approval was already included in the command

## Required Commit Message Formats

```text
feat: <feature-tag>-<task id> - <description>
```

Ad hoc feature commits are also allowed when the user wants to make a focused feature addition without treating it as the main task-completion commit.

Ad hoc feature format:

```text
feat: <feature-tag>-<task id>+ - <description>
```

## Follow-Up Commit Prefixes

The following explicit follow-up prefixes are also allowed when the user is preparing a commit that builds on existing work rather than representing the main task-completion commit:

- `tidy`
- `style`
- `fix`
- `docs`
- `mgmt`
- `tweak`

Follow-up format:

```text
<prefix>: <feature-tag>-<task id>+ - <description>
```

Tracked-feature-scoped follow-up format:

```text
<prefix>: <feature-tag>-0+ - <description>
```

Repo-scoped follow-up format:

```text
<prefix>: repo-0+ - <description>
```

The literal `repo` is a reserved context marker meaning the commit is not tied to one specific tracked feature.

## Terminology

Use these terms consistently:

- `commit prefix`: the literal prefix token from the command, such as `feat`, `fix`, or `mgmt`; the main task commit has an implicit main `feat` prefix even when the user does not spell it out
- `commit mode`: the behavior class inferred from the commit prefix
- `context mode`: what the commit is attached to: `task-scoped`, `tracked-feature-scoped`, or `repo-scoped`

## Prefix-To-Mode Mapping

Do not blur commit prefix, commit mode, and context mode. They are separate decisions.

Use this mapping:

- implicit main `feat` -> `main-task`
- explicit `feat` -> `ad-hoc-feat`
- `fix`, `tidy`, `style`, `docs`, and `tweak` -> `follow-up`
- `mgmt` -> `management`

Use these context modes:

- `task-scoped`: the commit is tied to a specific task inside a specific tracked feature
- `tracked-feature-scoped`: the commit is tied to a specific tracked feature but not to a specific task
- `repo-scoped`: the commit is not tied to one specific tracked feature or task

Map commit mode to allowed context modes like this:

- `main-task`: `task-scoped` only
- `ad-hoc-feat`: `task-scoped`, `tracked-feature-scoped`, or `repo-scoped`
- `follow-up`: `task-scoped`, `tracked-feature-scoped`, or `repo-scoped`
- `management`: `tracked-feature-scoped` or `repo-scoped`; never `task-scoped` unless the rule is explicitly revised later

## Context Selection Rules

After identifying the commit mode, choose the context mode. Do not let the prefix alone pretend to answer the context question.

Use this context-selection priority:

- If the user explicitly names a task, use task-scoped context unless the prefix forbids task-scoped use
- If the user explicitly names a tracked feature without a task, use tracked-feature-scoped context
- If the diff strongly matches one task, use task-scoped context when the prefix allows it
- If the diff clearly belongs to one tracked feature but not one task, use tracked-feature-scoped context
- If the diff does not clearly belong to one tracked feature, use repo-scoped context when the prefix allows it

A strong task diff match means one task is clearly favored by the actual changes, such as:

- the user explicitly names the task
- the changed files or modules line up cleanly with one task
- the task wording directly matches the scoped diff
- the current work is an obvious regression fix or follow-up to one task and no competing task is similarly plausible

A clear tracked-feature match means the work belongs to one tracked feature overall even if it does not map cleanly to one task.

Explicit tracked-feature selectors may override the active tracked feature for follow-up commit context. This does not change tracked-feature state, does not switch branches, and does not authorize implementation on that tracked feature by itself.

A `narrow recency fallback` means the assistant may use the most recently completed task as the commit's task context only when all of the following are true:

- the commit mode is `main-task`
- the user did not specify a task
- the diff does not strongly match any task
- the commit is still clearly tied to the active tracked feature
- there is one unambiguous most recently completed task in that tracked feature
- no other task is similarly plausible

Do not use the narrow recency fallback when any of the following are true:

- the commit mode is `ad-hoc-feat`, `follow-up`, or `management`
- the diff plausibly matches multiple tasks
- the work is only tracked-feature-scoped or repo-scoped
- the fallback would create a fake task relationship based only on recency

If two or more tasks remain plausible after applying the rules above, do not infer. Ask the user to choose.

## Invocation Parsing

After recognizing rule 8, parse trailing tokens in this order:

1. reserved rule-8 arguments
2. explicit task identifiers
3. explicit tracked-feature selectors such as `feature <tag>`, plus planned-feature selectors such as `for planned feature <tag>` when the commit mode permits planned tracked-feature context, currently `mgmt`
4. remaining free-form description text

Reserved rule-8 arguments are:

- `tidy`
- `style`
- `fix`
- `docs`
- `mgmt`
- `tweak`
- `feat`
- `approve`
- `approved`

If a token matches both a reserved rule-8 argument and a possible feature alias, treat it as the reserved rule-8 argument unless the user explicitly identifies a feature.

## Process

### Inspect

1. **Identify the Commit Prefix, Mode, and Context**
   - Parse the commit prefix from the user's command
   - Map the commit prefix to the commit mode using the prefix-to-mode mapping above
   - Read `/ai-work/00-workflow-config.md` and `/ai-work/00-feature-status.md` when task-scoped or tracked-feature-scoped context may apply
   - If `/ai-work/00-workflow-config.md` is needed and missing, ask whether `branch_mode` should be `required` or `optional`, write the file, and then continue
   - Use the active tracked feature as the default tracked-feature context unless the user explicitly identifies another tracked feature for follow-up commit labeling, or the commit is repo-scoped
   - If `branch_mode: required`, use the active branch as an additional required source of truth for main task mode and for ad hoc `feat` when the selected context is task-scoped or tracked-feature-scoped
   - If the user provides a task ID, use task-scoped context unless the commit mode forbids task-scoped use
   - If the user provides a tracked-feature selector without a task ID, use tracked-feature-scoped context unless the diff clearly supports repo-scoped context and the user explicitly prefers that
   - For `main-task`, if the user does not provide a task ID, identify the task that best matches the current diff before considering the narrow recency fallback
   - For `ad-hoc-feat`, if the user does not provide a task ID, prefer task-scoped context when the diff strongly matches one task, otherwise prefer tracked-feature-scoped context when one tracked feature is clear, otherwise use repo-scoped context
   - For `follow-up`, prefer task-scoped context when the match is strong, otherwise prefer tracked-feature-scoped context when one tracked feature is clear, otherwise use repo-scoped context
   - For `management`, never infer a task; prefer repo-scoped context, and use tracked-feature-scoped context only when the work clearly belongs to one tracked feature
   - For `management`, an explicit tracked-feature selector may reference a `planned` tracked feature without activating it
   - In main task mode only, if no clear task match exists after that and there is one obvious most recently completed task, use that task as the narrow last-resort fallback
   - If the selected context is repo-scoped, use the reserved context marker `repo-0+`
   - If `mgmt` is requested but the diff is clearly task-oriented, do not force a task mapping; ask whether the user wants a different prefix instead
   - If two or more plausible task mappings remain, do not infer
   - If two or more plausible tracked-feature mappings remain for tracked-feature-scoped context, do not infer
   - Present the strongest candidate task or tracked-feature contexts briefly and ask the user to choose before proposing a commit

2. **Review Task Context**
   - Read `/ai-work/{feature-tag}-tasks.md` only when using task-scoped context
   - Use the task wording as the basis for the description when a real task id is being used
   - If the selected context is tracked-feature-scoped `0+` or repo-scoped `repo-0+`, base the description on the scoped diff and the user's wording instead of pretending a completed task exists
   - For `mgmt`, do not rewrite the description as if the commit were task delivery or bug-fix work tied to one numbered task

3. **Inspect Current Git Changes**
   - Review the current Git status
   - Identify only the files related to the selected task, tracked feature, or repo-scoped support change
   - Exclude unrelated or unfinished work
   - For follow-up prefixes and ad hoc `feat`, treat the candidate commit message as a summary of the full scoped diff since `HEAD`, not just the most recent user request in the conversation
   - If multiple related changes have accumulated since the last commit, make the description reflect the combined result at the chosen scope

### Propose

4. **Draft the Commit Description**
   - Keep it concise and specific
   - For follow-up prefixes and ad hoc `feat`, summarize all known in-scope changes since the last commit that will be included in the proposed commit

5. **Propose the Commit**
   - Present the proposed message and file list
   - Ask `Approve this? Y/N.` unless the user already provided preapproval in the same command

### Execute and Report

6. **Create the Commit When Preapproved**
   - If the user's rule invocation already includes `approve` or `approved`, treat that as approval for the proposed task-scoped, tracked-feature-scoped, or repo-scoped commit
   - Still inspect the chosen context and changed files first
   - If the diff is clearly scoped to one task, one feature, or one repo-scoped support change under the context rules above, create the commit after preparing the message and file scope without asking a second approval question
   - If the diff is ambiguous, spans multiple tasks, or includes unrelated work, stop and ask for clarification instead of using preapproval blindly
   - After committing, report the commit message and resulting repository state

## Default Behavior

- If the user says only `run 8`, assume the active tracked feature
- If the user says `run 8 approve`, `run rule 8 approve`, `run 8 approved`, or equivalent, treat that as preapproval for a clean task-aligned commit
- If the commit mode is `main-task`, use this task-selection order:
  1. explicit task ID from the user
  2. task that best matches the actual diff
  3. most recently completed task only as a narrow fallback for true task-completion commits
- If the commit mode is `ad-hoc-feat`, use this context-selection order:
  1. explicit task ID from the user
  2. explicit tracked-feature selector from the user
  3. strongest task match from the actual diff
  4. strongest tracked-feature match from the actual diff
  5. `repo-0+` otherwise
- If the commit mode is `follow-up`, use this context-selection order:
  1. explicit task ID from the user
  2. explicit tracked-feature selector from the user
  3. strongest task match from the actual diff when the match is strong
  4. strongest tracked-feature match from the actual diff
  5. `repo-0+` otherwise
- If the commit mode is `management`, prefer `repo-0+`; use `<feature-tag>-0+` only when the diff clearly belongs to one tracked feature
- For `run 8 tidy`, `run 8 style`, `run 8 fix`, `run 8 docs`, `run 8 mgmt`, `run 8 feat`, and `run 8 tweak`, write the description to match the full scoped set of uncommitted changes since the last commit
- If there are no changes, do not propose a commit
- If the diff appears to span multiple tasks, multiple tracked features, or unrelated work, surface that clearly and ask the user how to scope the commit

## Example Interaction Flow

```text
User: "run 8 feat"

AI: [Reads 00-feature-status.md and the active task list]
AI: [Reviews the diff]
AI: [Matches the diff to the best task, falling back to tracked-feature-scoped `0+` only if no strong task match exists]
AI: [Summarizes the ad hoc feature work from the uncommitted changes]
AI: "Proposed commit: `feat: 02-vchannel-mgmt-2.5+ - add focused admin review tooling`"
```

```text
User: "run 8 feat for a small admin filter improvement"

AI: [Reads 00-feature-status.md and the active task list]
AI: [Reviews the diff]
AI: [Treats `feat` as ad hoc feature mode]
AI: [Uses the user's wording to steer the proposed description]
AI: "Proposed commit: `feat: 02-vchannel-mgmt-4.2+ - add admin filter refinement`"
```

```text
User: "run 8 mgmt for planned feature 03-user-auth"

AI: [Reads 00-feature-status.md and sees 03-user-auth is still planned]
AI: [Reviews the diff]
AI: [Treats `mgmt` as management mode and keeps the planned feature only as commit context]
AI: "Proposed commit: `mgmt: 03-user-auth-0+ - update auth rollout planning`"
```

```text
User: "run 8 fix feature 01-initial"

AI: [Reads 00-feature-status.md and the target feature task list]
AI: [Reviews the diff]
AI: [Uses the explicit feature selector rather than the active tracked feature]
AI: [Finds no strong task match inside that tracked feature]
AI: [Uses tracked-feature-scoped `0+`]
AI: "Proposed commit: `fix: 01-initial-0+ - resolve login redirect regression`"
```

```text
User: "run 8 fix"

AI: [Reviews the diff]
AI: [Finds no strong task match and no single clear feature match]
AI: [Uses repo-scoped context]
AI: "Proposed commit: `fix: repo-0+ - resolve shared config regression`"
```

```text
User: "run 8 approve"

AI: [Reads the active task list]
AI: [Reviews the diff]
AI: "The diff plausibly maps to task `3.4` and task `4.1`. I won't infer the task. Which one should this commit use?"
```

```text
User: "run 8"

AI: [Reads 00-feature-status.md]
AI: "Feature `01-initial` is completed. I won't prepare a new implementation commit for a completed tracked feature unless you explicitly ask for an exception."
```

## Git Command Sequencing

- Do not rely on shell chaining semantics to serialize Git commit workflow steps across platforms
- Do not issue `git add`, `git commit`, or `git status` simultaneously through parallel tool calls
- Do not run `git status` at the same time as `git add` or `git commit`
- Run `git add`, `git commit`, and any post-commit `git status` as separate sequential shell commands
- Do not bundle `git add`, `git commit`, and `git status` into the same shell invocation

## Non-Active and Completed Feature Behavior

- Do not prepare main task commits when no tracked feature is active, even if the repository is still checked out on an old feature branch
- Do not prepare task-scoped or tracked-feature-scoped ad hoc `feat` commits when no tracked feature is active
- If `branch_mode: required`, do not prepare main task commits or task-scoped or tracked-feature-scoped ad hoc `feat` commits when the current branch does not match the active tracked-feature branch
- If `branch_mode: optional`, do not reject implementation commit preparation solely because the current branch differs from any recorded tracked-feature branch
- Do not prepare main task commits or task-scoped or tracked-feature-scoped ad hoc `feat` commits for a paused tracked feature until it has been switched back to active
- Do not prepare new main task commits or task-scoped or tracked-feature-scoped ad hoc `feat` commits for completed tracked features unless the user explicitly asks for an exception
- `mgmt` may reference a planned, non-active, or completed tracked feature as commit context without changing feature state
- Non-`mgmt` follow-up prefixes may reference a non-active or completed tracked feature as commit context when the rule otherwise permits that scope
- Repo-scoped follow-up commits and repo-scoped ad hoc `feat` commits may be prepared even when no tracked feature is active

## Final Instructions

1. Do not create the commit until the user explicitly approves the message and scope, unless the same command already included `approve` or `approved`
2. Parse the commit prefix, map it to a commit mode, and then choose whether the commit is task-scoped, tracked-feature-scoped, or repo-scoped before choosing a message format
3. If `branch_mode: required`, inspect the current Git branch first for main task commits and for ad hoc `feat` when the selected context is task-scoped or tracked-feature-scoped
4. If no tracked feature is active, refuse main task commits until the user activates or switches to a tracked feature
5. Do not block explicit ad hoc `feat` commits solely because no tracked feature is active when the correct context is repo-scoped
6. Do not block repo-scoped follow-up commits solely because no tracked feature is active
7. Allow `mgmt` to use a planned tracked feature as commit context without activating that feature
8. Prefer a narrow, task-aligned commit over a broad convenience commit
9. Use the exact main-task format `feat: <feature-tag>-<task id> - <description>` for main task-completion commits
10. Use the exact ad hoc feature format `feat: <feature-tag>-<task id>+ - <description>` when the user explicitly requests ad hoc `feat` in task-scoped or tracked-feature-scoped context
11. Use the exact repo-scoped ad hoc feature format `feat: repo-0+ - <description>` when explicit ad hoc `feat` is not tied to one tracked feature
12. Use the exact follow-up format `<prefix>: <feature-tag>-<task id>+ - <description>` for task-scoped `tidy`, `style`, `fix`, `docs`, and `tweak`
13. Use the exact tracked-feature-scoped follow-up format `<prefix>: <feature-tag>-0+ - <description>` when the work belongs to one tracked feature but not one task
14. Use the exact repo-scoped follow-up format `<prefix>: repo-0+ - <description>` when the work does not belong to one tracked feature
15. Do not use the most recently completed task as a generic fallback for `fix`, `tidy`, `style`, `docs`, `mgmt`, or `tweak`
16. For `mgmt`, prefer repo-scoped context and do not infer a task relationship
17. Surface unrelated changes clearly instead of silently bundling them
18. For follow-up prefixes and ad hoc `feat`, including `tweak`, ensure the description summarizes all known in-scope changes included since `HEAD`, not only the latest tweak discussed
19. Use `0+` only for tracked-feature-scoped or repo-scoped contexts, not for `main-task` commits
