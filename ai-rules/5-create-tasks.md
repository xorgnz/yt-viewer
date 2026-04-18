---
version: 1.4.1
timestamp: 2026-04-13 00:00
---
# Rule: Generating a Task List from User Requirements

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active` or an explicitly selected `planned` feature
- The feature must not be marked `paused` or `completed`
- A PRD must exist at `/ai-work/{feature-tag}-prd.md`
- The master tech stack must exist at `/ai-work/00-master-techstack.md`

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
   - Treat the PRD as the implementation-facing boundary and requirements document
7. Generate the task list in one pass, using parent tasks and sub-tasks only where they improve execution clarity
8. Identify relevant files and tests when that context will materially help implementation
9. Save the completed task list to `/ai-work/{feature-tag}-tasks.md`

## Output Format

The task list must include:

- `## Tasks`

The task list may also include supporting sections such as `## Relevant Files` when they add real value.

Tasks must use markdown checkboxes. Use hierarchical numbering only when it improves readability.
