---
version: 2.0.0
timestamp: 2026-04-04 11:15
status: partially-implemented
---
# Suggested Improvements Status

## Purpose

This document records which workflow improvements from the earlier `ai-rules` review were adopted, how they were implemented, and which follow-up items remain open.

## Implemented

### Rule 1 prompt narrowing

- Adopted.
- Implemented in `ai-rules/1-create-feature-tag.md`.
- Feature-tag prompting now happens only when no valid target feature already exists.

### Rule 2 planned-feature scope handling

- Adopted.
- Implemented in `ai-rules/2-create-scope.md`.
- Scope creation may proceed for a specifically named planned feature without forcing activation.

### Rule 2 approval gate

- Adopted.
- Implemented in `ai-rules/2-create-scope.md`.
- The rule now uses inspect, propose, approval, execute, and report phases.

### Rule 3 approval and draft handling

- Adopted with one refinement.
- Implemented in `ai-rules/3-create-prd.md`.
- The first PRD draft is written to the target file, marked as draft, refined from there, and only treated as final after explicit approval.

### Rule 5 parent-task persistence

- Adopted.
- Implemented in `ai-rules/5-create-tasks.md`.
- Parent tasks are now saved as a draft before waiting for `Go`.

### Rule 8 `feat` ambiguity

- Adopted.
- Implemented in `ai-rules/8-prepare-commit.md`.
- Ad hoc `feat` is now a dedicated mode rather than a generic follow-up prefix.

### Rule 8 task association order

- Adopted.
- Implemented in `ai-rules/8-prepare-commit.md`.
- Commit preparation now prefers explicit task ID, then best diff match, then most recently completed task as fallback.

### Rule 9 strict branch and state handling

- Partially adopted.
- Implemented in `ai-rules/9-change-feature.md` and `ai-work/00-feature-status.md`.
- Branch/state alignment and ambiguity handling were tightened, but the pause and close behavior is still under review.

### Shared feature-state contract

- Adopted.
- Implemented in `ai-work/00-feature-status.md`.
- The contract now defines statuses, transitions, branch alignment, and completion metadata expectations.

### Shared ambiguity handling and phase structure

- Adopted.
- Implemented across `ai-rules/2-create-scope.md`, `ai-rules/3-create-prd.md`, `ai-rules/8-prepare-commit.md`, and `ai-rules/9-change-feature.md`.

### Command glossary

- Adopted.
- Implemented in `ai-rules/00-command-glossary.md`.

## Remaining Open Follow-Up

### Feature inactive-state model

- Open.
- Follow-up work is tracked in `ai-work/ai-rules-improvements-tasks.md` under task `4.0`.
- Remaining questions:
  - Should standalone `pause` stop being a user-facing workflow action?
  - When should `no active feature` be allowed?
  - Should closing a feature avoid automatic checkout to `main` and instead report the inactive branch state explicitly?

## Recommended Next Step

- Complete the feature-state follow-up under task `4.0`.
