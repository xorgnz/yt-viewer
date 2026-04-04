# AI Rules Improvements Plan

## Overview

This document captures the proposed implementation plan for the workflow improvements identified in [`ai-rules/__suggested_improvements.md`](D:/workspaces/yt-viewer/ai-rules/__suggested_improvements.md).

The work should be executed in three separate phases so rule contradictions are removed first, shared workflow standards are added second, and usability improvements are added last.

## Goals

1. Remove contradictions and ambiguous behavior from the current `ai-rules` documents.
2. Standardize approval, ambiguity-handling, and execution patterns across the rule set.
3. Improve the usability of the rules with examples and shorthand guidance after the core behavior is stable.

## Non-Goals

- Changing application code outside `ai-rules` and `ai-work` unless a supporting status or reference document must be updated.
- Activating a new product feature or switching the current implementation feature.
- Expanding the workflow beyond the improvements already identified in the suggestions review.

## Phase Breakdown

## Phase 1: Resolve Direct Rule Conflicts

### Objective

Update the affected rule files so they no longer contradict themselves or each other in normal usage.

### Target Files

- `ai-rules/1-create-feature-tag.md`
- `ai-rules/2-create-scope.md`
- `ai-rules/5-create-tasks.md`
- `ai-rules/8-prepare-commit.md`
- `ai-rules/9-change-feature.md`

### Planned Changes

1. Narrow rule 1 so it only prompts for feature-tag creation when no valid target feature already exists.
2. Update rule 2 so scope creation is allowed for a specifically named `planned` feature without forcing activation through the feature-change workflow.
3. Define rule 5 parent-task behavior explicitly as a saved draft flow:
   - save the parent-task draft to `/ai-work/{feature-tag}-tasks.md`
   - wait for `Go`
   - expand the same file with sub-tasks and related details
4. Remove the `run 8 feat` ambiguity in rule 8 by treating ad hoc `feat` as a dedicated mode, not a generic follow-up prefix.
5. Enforce strict branch and feature-state alignment in rule 9 for pause and close flows.

### Expected Outcome

The core planning, tasking, commit, and feature-change rules should be internally consistent and predictable.

## Phase 2: Add Shared Workflow Standards

### Objective

Add cross-rule standards that reduce premature writes, ambiguous inference, and inconsistent execution flow.

### Target Files

- `ai-rules/2-create-scope.md`
- `ai-rules/3-create-prd.md`
- `ai-rules/8-prepare-commit.md`
- `ai-rules/9-change-feature.md`
- `ai-work/00-feature-status.md` or a new shared contract document if a separate file is preferred during implementation

### Planned Changes

1. Add explicit approval gates before writing durable scope and PRD documents.
2. Add a shared ambiguity-handling standard:
   - if two or more plausible interpretations exist, do not infer
   - present the candidates briefly
   - ask the user to choose
3. Standardize rule structure around:
   - inspect current state
   - propose artifact or action
   - wait for approval when needed
   - execute and report
4. Define a shared feature-state contract covering:
   - allowed status values
   - allowed transitions
   - whether no active feature is allowed
   - whether branch mismatch is ever permitted
   - completion metadata expectations
5. Tighten commit-task association guidance in rule 8 to prefer:
   - explicit task ID
   - best diff match
   - most recently completed task only as a fallback

### Expected Outcome

The rule set should follow one clear operating model for approvals, inference boundaries, and execution phases.

## Phase 3: Improve Usability and Examples

### Objective

Make the rule set easier to use in practice once the underlying behavior is stable.

### Target Files

- `ai-rules/8-prepare-commit.md`
- `ai-rules/9-change-feature.md`
- `ai-rules/__suggested_improvements.md`
- Optional new glossary document under `ai-rules/`

### Planned Changes

1. Add concrete examples for exceptional or high-risk cases:
   - creating scope for a planned feature
   - making a historical correction to a completed feature
   - preparing a commit when the diff spans multiple tasks
   - pausing or closing a feature when checkout is blocked by local changes
2. Add a short glossary for shorthand commands such as:
   - `Go`
   - `run 8`
   - `run 8 tidy`
   - `run 8 feat`
3. Update the suggestions document to show which recommendations were adopted and how they were implemented.

### Expected Outcome

The rule set should be easier to interpret quickly, especially in edge cases and shorthand-driven flows.

## Sequencing

The phases should be executed in order:

1. Phase 1 removes contradictions that would otherwise make later edits unstable.
2. Phase 2 adds shared standards on top of the corrected baseline.
3. Phase 3 adds examples and support material after the core behavior is settled.

No phase should silently incorporate work from a later phase unless the user explicitly asks for it.

## Open Decisions Already Chosen

The current plan assumes the following implementation choices:

1. Rule 5 should use a saved parent-task draft rather than a preview-only parent-task stage.
2. Rule 9 should use strict branch and feature-state alignment during pause and close flows.
3. Rule 8 should keep ad hoc `feat` as a dedicated mode rather than a general follow-up prefix.

## Validation Expectations

After each phase:

1. Review the affected rule files for internal consistency.
2. Check that examples and final instructions match the updated rule behavior.
3. Confirm no remaining wording contradicts the adopted decisions in this plan.
