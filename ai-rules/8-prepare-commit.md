---
version: 1.10.4
timestamp: 2026-04-17 10:35
---
# Rule: Prepare a Commit for Approval

## Overview. 

This rule guides an AI assistant in preparing commits to git. To execute, parse the invocation in Step 0, then work through steps 1 through 6 in order.

Use this rule when the user explicitly asks to run rule 8 or otherwise asks to prepare a commit.

## Core Principle

The AI must not commit automatically when using this rule unless the user explicitly includes approval in the same request.

- Step 0 parses the rule invocation into reserved arguments, explicit selectors, and free-form description text.
- Step 1 uses parsed invocation parameters and repository context to choose the candidate context mode; what the commit is attached to.
- Step 2 selects the commit prefix, determines the commit mode, and validates the candidate context into a selected context.
- Step 3 prepares the tag from the selected context, selected prefix, and commit mode.
- Step 4 builds the full commit message from the prefix, tag, and scoped diff.
- Step 5 confirms the exact message and file scope with the user.
- Step 6 creates the commit and reports the result.

## Step 0 - Parse invocation

After recognizing rule 8, parse trailing tokens in this order:

1. reserved rule-8 arguments
2. explicit task identifiers
3. explicit tracked-feature selectors such as `feature <tag>`, plus planned-feature selectors such as `for planned feature <tag>` when the parsed reserved arguments indicate `mgmt`
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

## Step 1 - Identify the context mode 

Choose a candidate context mode from explicit selectors and diff evidence.

Context modes:

- `task-scoped`: the commit is tied to a specific task inside a specific tracked feature
- `tracked-feature-scoped`: the commit is tied to a specific tracked feature but not to a specific task
- `repo-scoped`: the commit is not tied to one specific tracked feature or task

### Context selection

Use this context-selection priority:

1. If the user explicitly names a task, use task-scoped context.
2. If the user explicitly names a tracked feature without a task, use tracked-feature-scoped context.
3. If the diff strongly matches one task, use task-scoped context.
4. If the diff clearly belongs to one tracked feature but not one task, use tracked-feature-scoped context.
5. If the diff does not clearly belong to one tracked feature, use repo-scoped context.

A strong task diff match means one task is clearly favored by actual changes, such as:

- the user explicitly names the task
- the changed files or modules line up cleanly with one task
- the task wording directly matches the scoped diff
- the current work is an obvious regression fix or follow-up to one task and no competing task is similarly plausible

A clear tracked-feature match means the work belongs to one tracked feature overall even if it does not map cleanly to one task.

Explicit tracked-feature selectors may override the active tracked feature for follow-up commit context. This does not change tracked-feature state, does not switch branches, and does not authorize implementation on that tracked feature by itself.

If two or more tasks remain plausible after applying the rules above, do not infer. Ask the user to choose.

If two or more plausible tracked-feature mappings remain for tracked-feature-scoped context, do not infer.

Present the strongest candidate task or tracked-feature contexts briefly and ask the user to choose before proposing a commit.

If the diff appears to span multiple tasks, multiple tracked features, or unrelated work, surface that clearly and ask the user how to scope the commit.

### Feature-state gates

Apply these gates when Step 2 selects the commit mode and selected context.

- When task-scoped or tracked-feature-scoped context may apply, read `/ai-work/00-workflow-config.md` and `/ai-work/00-feature-status.md`, and follow the feature-state contract in `/ai-work/00-feature-status.md`.
- If `/ai-work/00-workflow-config.md` is needed and missing, ask whether `branch_mode` should be `required` or `optional`, write the file, and then continue
- Use the active tracked feature as the default tracked-feature context unless the user explicitly identifies another tracked feature for follow-up commit labeling, or the commit is repo-scoped
- Main-task commits and task-scoped or tracked-feature-scoped ad hoc `feat` commits require an active tracked feature
- If `branch_mode: required`, main-task commits and task-scoped or tracked-feature-scoped ad hoc `feat` commits require the current branch to match the active tracked-feature branch; if `branch_mode: optional`, do not reject solely because the current branch differs
- Do not prepare main-task commits or task-scoped/tracked-feature-scoped ad hoc `feat` commits for paused or completed tracked features unless the user explicitly asks for an exception
- For `management`, an explicit tracked-feature selector may reference a `planned`, non-active, or completed tracked feature without activating it
- Non-`mgmt` follow-up prefixes may reference a non-active or completed tracked feature as commit context when the rule otherwise permits that scope
- Repo-scoped follow-up commits and repo-scoped ad hoc `feat` commits do not require an active tracked feature or task list

## Step 2 - Select prefix and commit mode

Choose the commit prefix for the final message before constructing the commit tag or message body.

### Select prefix

Available prefixes are:

- `feat` - feature or implementation work. When the user does not request a prefix, treat `feat` as the implicit default for the main task-completion commit. When the user explicitly requests `feat`, treat it as an ad hoc feature commit instead.
- `fix` - corrects a bug or unintended behavior
- `tweak` - small targeted adjustments with no structural change: config values, tuning parameters, threshold adjustments, minor wording fixes
- `docs` - changes to purely informational content (READMEs, architecture docs, inline comments) that have no effect on behavior; skill files, CLAUDE.md, and command files are not `docs` - use `feat`, `fix`, or `tweak` depending on the nature of the change
- `style` - formatting, naming, or whitespace with no behavior change
- `tidy` - non-functional codebase cleanup within product/application code: dead code removal, internal reorganization, refactors with no behavior change, and maintenance dependency updates
- `mgmt` - repository/workflow management outside product code: `ai-work/`, rule/guideline files, planning notes, board/status files, `.gitignore`, and repository config

### Commit Modes

Do not blur requested prefix, selected commit prefix, commit mode, and context mode. They are separate decisions.

The available commit modes are:

- `main-task`: the normal task-completion commit for implemented work tied to a real task
- `ad-hoc-feat`: focused feature or implementation work that should not be treated as the main task-completion commit
- `follow-up`: a bug fix, polish pass, documentation-only update, style change, cleanup, or small tweak that builds on existing work
- `management`: repository or workflow management outside product implementation work

Map prefixes to commit modes like this:

- implicit main `feat` -> `main-task`
- explicit `feat` -> `ad-hoc-feat`
- `fix`, `tidy`, `style`, `docs`, and `tweak` -> `follow-up`
- `mgmt` -> `management`

The explicit `fix`, `tidy`, `style`, `docs`, and `tweak` prefixes use follow-up mode because they build on existing work rather than representing the main task-completion commit.

### Prefix selection precedence

Use this precedence to choose or validate the selected commit prefix:

1. Use the user's requested prefix when provided, unless it clearly conflicts with the scoped diff intent.
2. Determine primary intent from the full scoped diff and apply the existing prefix definitions in this rule.
3. Use changed-file mix as secondary evidence to confirm the intent decision.
4. If multiple prefixes remain plausible after this check, do not infer; ask the user to choose.

If a requested prefix conflicts with the strongest scoped intent, present the mismatch and ask the user whether to keep the requested prefix or switch.

### Mode-specific context validation

Validate commit mode against allowed context modes as follows. Alert the user if the commit mode is not allowed for the candidate context:

- `main-task`: `task-scoped` only
- `ad-hoc-feat`: `task-scoped`, `tracked-feature-scoped`, or `repo-scoped`
- `follow-up`: `task-scoped`, `tracked-feature-scoped`, or `repo-scoped`
- `management`: `tracked-feature-scoped` or `repo-scoped`; never `task-scoped` unless the rule is explicitly revised later

After the candidate context passes that validation, apply these mode-specific refinements and record the result as the selected context:

- `main-task`: if the user does not provide a task ID, identify the task that best matches the current diff before considering the narrow recency fallback.
- `ad-hoc-feat`: keep the candidate context after it passes validation.
- `follow-up`: keep the candidate context after it passes validation.
- `management`: never infer a task. Keep tracked-feature-scoped context only when the candidate context clearly belongs to one tracked feature; otherwise use repo-scoped context.

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

## Step 3 - Prepare tag

Prepare the tag segment that follows the selected prefix using the selected context and commit mode.

Allowed tag shapes:

- `<feature-tag>-<task id>` for main task commits
- `<feature-tag>-<task id>+` for task-scoped follow-up and ad hoc feature commits
- `<feature-tag>-0+` for tracked-feature-scoped follow-up and ad hoc feature commits
- `repo-0+` for repo-scoped follow-up and ad hoc feature commits

Use the selected context, selected prefix, and commit mode from Step 2 when selecting the tag.

The literal `repo` is a reserved context marker meaning the commit is not tied to one specific tracked feature.

Use `0+` only for tracked-feature-scoped or repo-scoped contexts, not for `main-task` commits.

## Step 4 - Commit message

Construct the full message from the selected prefix, the Step 3 tag, and a description that matches the scoped diff.

### Required Commit Message Format

```text
<prefix>: <step-3-tag> - <description>
```

### Scope checks

- Review the current Git status.
- Identify only the files related to the selected task, tracked feature, or repo-scoped support change.
- Exclude unrelated or unfinished work; surface unrelated changes clearly instead of silently bundling them.
- Prefer a narrow, task-aligned commit over a broad convenience commit.
- If there are no changes in the selected scope, do not propose a commit.

### Task-context checks

- When using task-scoped context, a task list should exist at `/ai-work/{feature-tag}-tasks.md`.
- Read `/ai-work/{feature-tag}-tasks.md` only when using task-scoped context.
- The relevant task should already be implemented when using task-scoped context.

### Description rules

- Use the task wording as the basis for the description when a real task id is being used.
- If the Step 3 tag is tracked-feature-scoped `<feature-tag>-0+` or repo-scoped `repo-0+`, base the description on the scoped diff and the user's wording instead of pretending a completed task exists.
- For `mgmt`, do not rewrite the description as if the commit were task delivery or bug-fix work tied to one numbered task.
- For follow-up prefixes, ad hoc `feat`, and explicit invocations such as `run 8 tidy`, `run 8 fix`, or `run 8 mgmt`, write the description to summarize the full in-scope diff since `HEAD`, not just the most recent user request in the conversation.
- If multiple related changes have accumulated since the last commit, make the description reflect the combined result at the chosen scope.
- Keep the description concise and specific.

## Step 5 - Confirm with user

1. Present the proposed message and file list.
2. Ask `Approve this? Y/N.` unless the user already provided preapproval in the same command.
3. The approval question must clearly bind to that exact message and that exact scoped file set.
4. If the user's rule invocation already includes `approve` or `approved`, treat that as approval for the proposed task-scoped, tracked-feature-scoped, or repo-scoped commit.

## Step 6 - Create commit and report

1. Still inspect the selected context and changed files first.
2. If the diff is clearly scoped to the selected task, tracked feature, or repo-scoped support change, create the commit after preparing the message and file scope without asking a second approval question.
3. If the diff is ambiguous, spans multiple tasks, or includes unrelated work, stop and ask for clarification instead of using preapproval blindly.
4. After committing, report the commit message and resulting repository state.

Step 6 command sequencing rules:

- Do not rely on shell chaining semantics to serialize Git commit workflow steps across platforms
- Do not issue `git add`, `git commit`, or `git status` simultaneously through parallel tool calls
- Do not run `git status` at the same time as `git add` or `git commit`
- Run `git add`, `git commit`, and any post-commit `git status` as separate sequential shell commands
- Do not bundle `git add`, `git commit`, and `git status` into the same shell invocation

## Example Interaction Flow

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
