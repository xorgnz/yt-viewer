---
version: 1.4.0
timestamp: 2026-04-08 11:05
---
# Rule: Generating a Task List from User Requirements

## Goal

To guide an AI assistant in creating a concise, implementation-ready task list in Markdown format for the active feature or an explicitly selected planned feature.

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active` or an explicitly selected `planned` feature
- The feature must not be marked `paused` or `completed`
- A PRD should exist at `/ai-work/{feature-tag}-prd.md`
- The master tech stack should exist at `/ai-work/00-master-techstack.md` if technology decisions have already been documented

## Output

- **Format:** Markdown
- **Location:** `/ai-work/`
- **Filename:** `{feature-tag}-tasks.md`

## Process

1. Read `/ai-work/00-feature-status.md`
2. Use the active feature by default
3. If the user names a different feature and it is `planned`, task generation may proceed without activating that feature
4. If the user names a different feature and it is `paused` or `completed`, stop and tell the user rule 5 does not run on that feature state
5. Only require the feature-change workflow when the user wants a different feature to become the active working feature
6. Analyze the PRD and master tech stack
7. Generate the task list in one pass, using parent tasks and sub-tasks only where they improve execution clarity
8. Identify relevant files and tests when that context will materially help implementation
9. Save the completed task list to `/ai-work/{feature-tag}-tasks.md`

## Output Format

The task list must include:

- `## Tasks`

The task list may also include supporting sections such as `## Relevant Files` when they add real value.

Tasks must use markdown checkboxes. Use hierarchical numbering only when it improves readability.

## Final Instructions

1. All task tracking occurs inside `/ai-work/{feature-tag}-tasks.md`
2. Generate the full task list in one pass unless the user explicitly asks for a staged draft-first workflow
3. Keep the task list focused on concrete implementation work rather than template filler
4. Do not generate or revise task lists for paused or completed features
5. Allow task generation for an explicitly selected planned feature without activating it
