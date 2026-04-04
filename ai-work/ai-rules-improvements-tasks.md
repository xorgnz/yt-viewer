## Relevant Files

- `ai-rules/1-create-feature-tag.md` - Phase 1 update to reduce redundant feature-tag prompting.
- `ai-rules/2-create-scope.md` - Phase 1 and Phase 2 updates for planned-feature scope handling and approval gates.
- `ai-rules/3-create-prd.md` - Phase 2 updates for approval-gated PRD writing.
- `ai-rules/5-create-tasks.md` - Phase 1 update for parent-task draft persistence behavior.
- `ai-rules/8-prepare-commit.md` - Phase 1, Phase 2, and Phase 3 updates for `feat` handling, ambiguity policy, commit-task association, and examples.
- `ai-rules/9-change-feature.md` - Phase 1, Phase 2, and Phase 3 updates for branch/state alignment, shared workflow structure, and exceptional-case examples.
- `ai-rules/__suggested_improvements.md` - Phase 3 update to reflect adopted decisions and implementation status.
- `ai-work/00-feature-status.md` - Possible Phase 2 location for a shared feature-state contract if no separate contract document is introduced.
- `ai-work/ai-rules-improvements-plan.md` - Phase planning reference for this effort.

### Notes

- Perform the work in three separate passes. Do not combine phases unless the user explicitly asks.
- Keep edits focused on workflow documentation and supporting references.
- If Phase 2 introduces a separate shared contract or glossary file, add it to this list when that phase begins.

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
- [ ] 2.0 Execute Phase 2 and add shared workflow standards
  - [ ] 2.1 Add approval gates to scope creation so clarification or draft approval happens before file writes
  - [ ] 2.2 Add approval gates to PRD creation so clarification or draft approval happens before file writes
  - [ ] 2.3 Add a shared ambiguity-handling standard to the rules that currently rely on inference
  - [ ] 2.4 Standardize the affected rules around inspect, propose, approval, execute, and report phases
  - [ ] 2.5 Add a shared feature-state contract in the chosen document location
  - [ ] 2.6 Update rule 8 to prioritize explicit task ID, then best diff match, then most recently completed task as fallback
  - [ ] 2.7 Review the edited Phase 2 files for cross-rule consistency with the Phase 1 decisions
- [ ] 3.0 Execute Phase 3 and improve usability with examples and glossary support
  - [ ] 3.1 Add planned-feature and completed-feature exception examples where the rules now allow or restrict those cases
  - [ ] 3.2 Add commit-preparation examples for ambiguous multi-task diffs and the adopted `run 8 feat` behavior
  - [ ] 3.3 Add feature pause or close examples that show behavior when checkout is blocked by local changes
  - [ ] 3.4 Add a short shorthand-command glossary in the chosen location if still needed after the rule edits
  - [ ] 3.5 Update `__suggested_improvements.md` to record the adopted decisions and implemented fixes
  - [ ] 3.6 Review the Phase 3 wording so the examples and glossary match the final rule behavior exactly
