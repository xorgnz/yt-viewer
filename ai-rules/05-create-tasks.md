---
version: 1.7.0
timestamp: 2026-04-30 00:00
---
# Rule: Generating a Task List from User Requirements

## Prerequisites

- A feature tag must exist
- `/ai-work/00-feature-status.md` must identify the feature as `active`, an explicitly selected `planned` feature, or an explicitly selected `future` feature
- The feature must not be marked `paused`, `completed`, or `archived`
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
4. If the user explicitly names a `future` feature, task generation may proceed without activating that feature
5. If the user names a different feature and it is `paused`, `completed`, or `archived`, stop and tell the user rule 5 does not run on that feature state
6. Only require the feature-change workflow when the user wants a different feature to become the active working feature
7. Do not bring future features into task planning for other features unless the user explicitly names the future feature as relevant
8. Analyze the PRD and master tech stack
   - Treat the PRD as the implementation-facing boundary and requirements document
   - If `/ai-work/00-architecture.md` exists, read it and use it to shape task boundaries, sequencing, and integration expectations
9. Generate the task list in one pass, using parent tasks and sub-tasks only where they improve execution clarity
10. Identify relevant files and tests when that context will materially help implementation
11. Include architecture-related tasks when the feature requires structural work, boundary changes, or updates to the architectural record
12. Save the completed task list to `/ai-work/{feature-tag}-tasks.md`

## Output Format

The task list must include:

- `## Tasks`

The task list may also include supporting sections such as `## Relevant Files` when they add real value.

Tasks must use markdown checkboxes. Use hierarchical numbering only when it improves readability.
