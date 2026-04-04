## Relevant Files

- `ai-rules/1-create-feature-tag.md` - Phase 1 update to reduce redundant feature-tag prompting.
- `ai-rules/2-create-scope.md` - Phase 1 and Phase 2 updates for planned-feature scope handling and approval gates.
- `ai-rules/3-create-prd.md` - Phase 2 updates for approval-gated PRD writing.
- `ai-rules/5-create-tasks.md` - Phase 1 update for parent-task draft persistence behavior.
- `ai-rules/8-prepare-commit.md` - Phase 1, Phase 2, and Phase 3 updates for `feat` handling, ambiguity policy, commit-task association, and examples.
- `ai-rules/9-change-feature.md` - Phase 1, Phase 2, and Phase 3 updates for branch/state alignment, shared workflow structure, and exceptional-case examples.
- `ai-rules/00-command-glossary.md` - Phase 3 glossary for shorthand workflow commands.
- `ai-work/00-feature-status.md` - Possible Phase 2 location for a shared feature-state contract if no separate contract document is introduced.
- `ai-work/ai-rules-improvements-plan.md` - Phase planning reference for this effort.

### Notes

- Perform the work in three separate passes. Do not combine phases unless the user explicitly asks.
- Keep edits focused on workflow documentation and supporting references.
- If Phase 2 introduces a separate shared contract or glossary file, add it to this list when that phase begins.
- The remaining open workflow issue from the earlier suggestions review is tracked only under task `4.0`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, update this markdown file by changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not only after completing a parent task.

## Tasks

- [x] 1.0 Execute Phase 1 and resolve direct rule conflicts
  - [x] 1.1 Update rule 1 so feature-tag prompting only occurs when no valid feature context already exists
  - [x] 1.2 Update rule 2 so a specifically named `planned` feature can receive scope work without forced activation
  - [x] 1.3 Update rule 5 to define a saved parent-task draft flow before sub-task expansion after `Go`
  - [x] 1.4 Update rule 8 so ad hoc `feat` is a dedicated mode and not also treated as a generic follow-up prefix
  - [x] 1.5 Update rule 9 to require strict branch and feature-state alignment for pause and close flows
  - [x] 1.6 Review the edited Phase 1 files for remaining contradictions in examples, defaults, and final instructions
- [x] 2.0 Execute Phase 2 and add shared workflow standards
  - [x] 2.1 Add approval gates to scope creation so clarification or draft approval happens before file writes
  - [x] 2.2 Add approval gates to PRD creation so clarification or draft approval happens before file writes
  - [x] 2.3 Add a shared ambiguity-handling standard to the rules that currently rely on inference
  - [x] 2.4 Standardize the affected rules around inspect, propose, approval, execute, and report phases
  - [x] 2.5 Add a shared feature-state contract in the chosen document location
  - [x] 2.6 Update rule 8 to prioritize explicit task ID, then best diff match, then most recently completed task as fallback
  - [x] 2.7 Review the edited Phase 2 files for cross-rule consistency with the Phase 1 decisions
- [x] 3.0 Execute Phase 3 and improve usability with examples and glossary support
  - [x] 3.1 Add planned-feature and completed-feature exception examples where the rules now allow or restrict those cases
  - [x] 3.2 Add commit-preparation examples for ambiguous multi-task diffs and the adopted `run 8 feat` behavior
  - [x] 3.3 Add feature pause or close examples that show behavior when checkout is blocked by local changes
  - [x] 3.4 Add a short shorthand-command glossary in the chosen location if still needed after the rule edits
  - [x] 3.5 Record the adopted Phase 1-3 decisions and implemented fixes
  - [x] 3.6 Review the Phase 3 wording so the examples and glossary match the final rule behavior exactly
- [x] 4.0 Refine feature-state rules so inactive state is limited and main is not implied as a working branch
  - [x] 4.1 Update rule 9 so standalone `pause` is no longer a primary user-facing workflow action
  - [x] 4.2 Update the shared feature-state contract so `no active feature` is allowed only before the first feature is activated or after closing an active feature with no replacement selected
  - [x] 4.3 Update rule 9 so closing a feature does not automatically require checkout to `main`, and instead reports any resulting inactive branch state clearly
  - [x] 4.4 Review rules 6 and 8 so implementation and commit work are rejected whenever no feature is active, even if the repository is still on an old feature branch
  - [x] 4.5 Update rule 9 examples so switching leaves the old feature `paused`, closing can leave no active feature selected, and no example implies working directly on `main`
