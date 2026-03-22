---
version: 1.1.0
timestamp: 2026-03-22 13:42
---
# Rule: Technology Stack Selection and Documentation

## Goal

To guide an AI assistant in evaluating technical requirements from the active feature PRD, proposing appropriate technology options, facilitating user decision-making, and documenting shared technology choices with minimal duplication.

## When to Use

Use this rule after creating the PRD and before creating the task list.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as active
- The feature must not be marked `completed`
- A completed PRD must exist at `/ai-work/{feature-tag}-prd.md`
- The master technology stack at `/ai-work/00-master-techstack.md` is the application-wide source of truth if it exists

## Process

1. Review the active feature PRD
2. Compare needs against `/ai-work/00-master-techstack.md`
3. Identify only the technology decision points that actually matter
4. Present 2-3 viable options with a recommendation where a decision is needed
5. Wait for user confirmation before documenting any new shared decision
6. Update `/ai-work/00-master-techstack.md` only when the feature introduces a new shared technology or architecture choice

## Final Instructions

1. Reuse the master stack whenever possible
2. Avoid documenting feature-local duplication when the master stack already covers it
3. Do not update tech-stack decisions for completed features unless the user explicitly requests historical correction work
