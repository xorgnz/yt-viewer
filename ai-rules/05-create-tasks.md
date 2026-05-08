---
version: 1.8.0
timestamp: 2026-05-02 00:00
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

When using numbered tasks with checkboxes, do not write entries in the form `[ ] 1. Task name` because many markdown renderers parse that poorly.

Use this form instead:

- top-level tasks: `[ ] 1 - Task name`
- subtasks: two-space indent followed by `[ ] 1.1 - Subtask name`

Use a hyphen between the task number and the task text for both tasks and subtasks.
Indent subtasks beneath their parent tasks so the hierarchy is visually clear.

## Example Task List

```md
## Tasks

- [ ] 1 - Set up authentication flow
  - [ ] 1.1 - Add login route and request handling
  - [ ] 1.2 - Add session validation middleware
  - [ ] 1.3 - Add authentication tests

- [ ] 2 - Integrate user profile loading
  - [ ] 2.1 - Add profile data loader
  - [ ] 2.2 - Render profile state in the UI
  - [ ] 2.3 - Add validation coverage for profile loading
```
