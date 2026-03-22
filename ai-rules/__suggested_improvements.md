# Suggested Improvements

## Findings From `ai-rules` Review

### 1. Rule 2 blocks its own planned-feature path

`ai-rules/2-create-scope.md` says scope creation is allowed for the active feature or an explicitly selected planned feature. In the process section, it then says that if the user names a different feature, the assistant should only proceed after switching through the feature-change workflow. That makes the documented planned-feature path effectively unusable.

Suggested fix:

- Allow scope creation for:
  - the active feature
  - a specifically named feature that is `planned`
- Only require the feature-change workflow when the user wants to make that feature active

### 2. Rule 5 has no defined artifact for the parent-task pause

`ai-rules/5-create-tasks.md` says to generate the parent tasks first, pause for the user's explicit `Go`, then generate sub-tasks. The same rule also says to save the final task list to `/ai-work/{feature-tag}-tasks.md`, but it does not define whether the parent-task-only draft should be saved first. That creates an execution gap.

Suggested fix:

- Explicitly define a two-step write flow:
  - save parent tasks to `/ai-work/{feature-tag}-tasks.md`
  - after the user says `Go`, expand the same file with sub-tasks and relevant files
- Or explicitly define a no-write preview flow for parent tasks before the final file is created

### 3. Rule 9 can leave feature state and branch state misaligned

`ai-rules/9-change-feature.md` says branch state and feature state should always align. But in both the `pause` and `close` flows, switching away from the feature branch is optional and deferred. That means the assistant can mark a feature inactive while still leaving the repo checked out on the old feature branch.

Suggested fix:

- Define one of these policies explicitly:
  - strict alignment: after pause/close, require checkout to a neutral branch before status is updated
  - soft alignment: allow temporary mismatch, but document it clearly and require the assistant to report it

Recommended choice:

- Use strict alignment. It is simpler and prevents ambiguous repository state.

### 4. Rule 8 defines ad hoc `feat` in two overlapping ways

`ai-rules/8-prepare-commit.md` introduces ad hoc `feat` commits as a distinct concept, then includes `feat` again in the follow-up prefix list. The final instructions later describe follow-up formatting for `tidy`, `style`, `fix`, `docs`, and `mgmt`, but not `feat`. That creates classification ambiguity for requests like `run 8 feat`.

Suggested fix:

- Pick one model:
  - model A: `feat` is a dedicated ad hoc mode and should not appear in the follow-up prefix list
  - model B: `feat` is just another follow-up prefix and should be documented consistently everywhere

Recommended choice:

- Use model A. Keep `feat` separate from the follow-up maintenance prefixes.

### 5. Rule 1 over-prompts in the normal workflow

`ai-rules/1-create-feature-tag.md` says to always prompt the user and offer to create a feature tag before creating scope, PRD, or tasks. Used literally, that would cause redundant prompts even when the feature already exists and is active.

Suggested fix:

- Narrow the instruction to:
  - offer feature-tag creation only when no valid target feature exists yet
  - otherwise continue with the existing feature context

### 6. Rules 2 and 3 write durable documents without an approval checkpoint

`ai-rules/2-create-scope.md` says to ask discovery questions, summarize understanding, generate the scope document, and save it. `ai-rules/3-create-prd.md` follows the same overall pattern for the PRD. Neither rule explicitly requires a final user approval checkpoint after clarification or draft generation and before writing the file.

That creates a failure mode where the assistant persists a scope or PRD based on partially confirmed understanding.

Suggested fix:

- Add an explicit checkpoint:
  - gather clarifications
  - summarize or draft
  - ask for approval
  - only then save to `/ai-work`

Recommended choice:

- Make planning-document creation conversational first and file-writing second.

## Workflow Improvements

### 1. Define a shared feature-state contract

Several rules assume behavior from `/ai-work/00-feature-status.md`, but the shape and allowed transitions are only partially specified.

Suggested improvement:

- Add one shared contract section, either in a dedicated rule or at the top of every workflow:
  - file schema
  - allowed status transitions
  - whether "no active feature" is allowed
  - whether branch mismatch is ever permitted
  - required fields for completion metadata

### 2. Add explicit ambiguity handling standards

A few rules say to infer context from the current diff or most recent completed task. That is useful, but it needs a sharper stop condition.

Suggested improvement:

- Add a standard ambiguity rule:
  - if two or more plausible task mappings exist, do not infer
  - present the top candidates briefly
  - ask the user to pick one

This would make rule 8 commit preparation more predictable.

### 3. Separate "inspect", "propose", and "execute" phases consistently

Some rules already do this well, especially rule 8. Others blur these phases.

Suggested improvement:

- Standardize each rule into:
  - inspect prerequisites and current state
  - propose the next artifact or action
  - wait for approval when needed
  - execute and report the result

This would reduce accidental file creation or state changes.

### 4. Add approval gates before writing durable planning documents

Scope and PRD generation are both vulnerable to premature writes if clarification is incomplete.

Suggested improvement:

- Require an explicit approval gate before writing:
  - approved summary
  - or approved generated draft
- Make the rule text explicit about whether the assistant should save immediately after approval or wait for a second "write it" instruction

### 5. Clarify when documents may be created for planned features

Rules 2 and 3 differ in how tightly they bind work to the active feature. The workflow should make a clear distinction between planning artifacts and implementation artifacts.

Suggested improvement:

- Allow planning artifacts for `planned` features:
  - scope
  - PRD
  - possibly task drafts
- Reserve implementation, validation tied to code changes, and task execution for `active` features only

### 6. Add a small command-intent glossary

The rules rely on short invocations such as `run 8 tidy`, `run 8 feat`, and `Go`. Those are convenient, but the meaning is spread across multiple files.

Suggested improvement:

- Add a short glossary document covering:
  - supported shorthand commands
  - what each command is expected to do
  - whether it proposes, edits, commits, or only asks questions

### 7. Define commit-task association policy more explicitly

Rule 8 currently defaults to "most recently completed task" for follow-up and ad hoc commits. In practice, code changes often align with an older task rather than the latest completed one.

Suggested improvement:

- Prefer this order:
  1. explicit task id from the user
  2. task that best matches the actual diff
  3. most recently completed task only as a fallback
- If diff-based matching and latest-completed differ, require user confirmation

### 8. Unify the meaning of `run 8 feat`

The external review correctly highlights that `run 8 feat` is still an unresolved workflow question, not just a wording issue.

Suggested improvement:

- Define `run 8 feat` as exactly one of:
  - a dedicated ad hoc feature-commit mode
  - a standard follow-up prefix mode
- Remove all alternate wording that suggests both are true
- Add one example interaction showing the expected proposal and resulting message

### 9. Add examples for exceptional cases

The rules mention exceptions for paused/completed features, but they do not show concrete examples.

Suggested improvement:

- Add one short example each for:
  - updating scope on a planned feature
  - making a historical correction on a completed feature
  - preparing a commit when the diff spans multiple tasks
  - pausing a feature with local changes that block checkout

## Recommended Priority Order

1. Fix rule 2 planned-feature scope handling
2. Add approval gates for scope and PRD writes
3. Fix rule 5 parent-task save/pause behavior
4. Fix rule 8 ad hoc `feat` ambiguity
5. Fix rule 9 branch/state alignment rules
6. Add shared ambiguity-handling and commit-association guidance

## Open Questions To Resolve Later

1. Should scope and PRD creation be conversational first, with file writes only after explicit approval of the summary or draft?
2. Should `run 8 feat` mean a dedicated ad hoc feature-commit flow, or should it be treated as just another follow-up prefix?
3. Should task-list generation save the parent-task skeleton before the user says `Go`, or should that first stage remain a non-persistent preview?
