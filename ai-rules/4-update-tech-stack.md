---
version: 1.2.1
timestamp: 2026-04-17 09:23
---
# Rule: Technology Stack Selection and Documentation

## Goal

To guide an AI assistant in evaluating technical requirements from the active feature PRD or an explicitly selected planned feature PRD, proposing appropriate technology options, facilitating user decision-making, and documenting shared technology choices with minimal duplication.

## When to Use

Use this rule after creating the PRD and before creating the task list.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active` or an explicitly selected `planned` feature
- The feature must not be marked `paused` or `completed`
- A completed PRD must exist at `/ai-work/{feature-tag}-prd.md`
- The master technology stack at `/ai-work/00-master-techstack.md` is the application-wide source of truth if it exists

## Process

1. Read `/ai-work/00-feature-status.md`
2. Use the active feature by default
3. If the user names a different feature and it is `planned`, tech-stack work may proceed without activating that feature
4. If the user names a different feature and it is `paused` or `completed`, stop and tell the user rule 4 does not run on that feature state
5. Only require the feature-change workflow when the user wants a different feature to become the active working feature
6. Review the selected feature PRD
7. Compare needs against `/ai-work/00-master-techstack.md`
8. Identify only the technology decision points that actually matter
9. Present 2-3 viable options with a recommendation where a decision is needed
10. Wait for user confirmation before documenting any new shared decision in `/ai-work/00-master-techstack.md`
11. Update `/ai-work/00-master-techstack.md` only when the feature introduces a new shared technology or architecture choice

## Final Instructions

1. Reuse the master stack whenever possible
2. Avoid documenting feature-local duplication when the master stack already covers it
3. Ask for approval only when writing a new shared decision to `/ai-work/00-master-techstack.md`; do not ask extra approval prompts for analysis or recommendation steps
4. When asking for approval, name the exact decision text that will be written
5. Do not update tech-stack decisions for paused or completed features
6. Allow tech-stack planning for an explicitly selected planned feature without activating it
