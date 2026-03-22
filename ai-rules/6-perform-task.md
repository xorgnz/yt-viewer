---
version: 1.0.0
timestamp: 2026-02-27 15:40
---

## Goal

To guide an AI assistant in executing development tasks from structured task lists while maintaining proper environment configuration, strict approval protocols, and accurate progress tracking.

## Prerequisites

- A feature tag must exist for the work being performed
- A task list must exist at `/ai-work/{feature-tag}-tasks.md`

## Task Management Protocol

### Feature Identification

1. **With Feature Tag:** When given a specific feature tag (e.g., "Work on feature 01-user-auth"), use the task file at `/ai-work/01-user-auth-tasks.md`
2. **With Direct File Reference:** If the user points directly to a task file, including through UI `@` notation, use that file as the source of truth for the requested work.
3. **Without Feature Tag:** If no feature is specified but multiple features exist:
   - List available feature task files in the `/ai-work` directory
   - Ask the user which feature to work on
   - Example: "I found multiple features: 01-user-auth, 02-payment-gateway. Which feature should I work on?"

### Task Selection Process

1. **With Task Number:** When given a specific task number (e.g., "Work on task 1.2 for feature 01-user-auth"), immediately begin working on that task in the specified feature's task file.
2. **Without Task Number:** If no task is specified:
   - Review the task list in the `/ai-work/{feature-tag}-tasks.md` file
   - Identify the next uncompleted task (look for `- [ ]` checkboxes)
   - Present the suggested task to the user
   - **WAIT for explicit approval** before proceeding
   - Example: "The next uncompleted task in 01-user-auth is 2.3 'Implement coordinate system utilities'. Shall I proceed with this task?"

### Task Execution Rules

**CRITICAL:** Never start work on any task without explicit user approval. You must:
- Only begin work after receiving a clear directive (task number or approval)
- Never assume permission to proceed based on context or previous instructions
- Always ask before moving to the next task, even if tasks are sequential

### Task File Format

Tasks are structured as hierarchical markdown checklists:

```markdown
## Tasks

- [ ] 1.0 Parent Task Title
  - [ ] 1.1 Sub-task description
  - [ ] 1.2 Sub-task description
- [ ] 2.0 Another Parent Task
  - [ ] 2.1 Sub-task description
    - [ ] 2.1.1 Nested sub-task (if applicable)
```

### Progress Tracking

**MANDATORY:** As you complete each task or sub-task:
1. Update the task file immediately
2. Change `- [ ]` to `- [x]` for the completed item
3. Example: `- [ ] 1.1 Initialize project` → `- [x] 1.1 Initialize project`
4. Save the file after each update to maintain accurate progress tracking

## Task File Location

- All task files are located in the `/ai-work` directory
- Naming convention: `{feature-tag}-tasks.md` (e.g., `01-user-auth-tasks.md`)
- Each task file includes:
  - **Relevant Files:** List of files to be modified or created
  - **Instructions for Completing Tasks:** Reminders about checkbox updates
  - **Tasks:** Hierarchical checklist of all work items

## Multiple Features

When multiple features exist in the project:
- Each feature typically has its own set of files: `{feature-tag}-scope.md`, `{feature-tag}-prd.md`, and `{feature-tag}-tasks.md`
- Shared technology decisions should be read from `/ai-work/00-master-techstack.md`
- Always confirm which feature you're working on before starting
- Keep task tracking separate per feature

## General Working Principles

1. **File Operations:** Prefer editing existing files over creating new ones unless creation is explicitly required
2. **Testing:** Run tests as specified in the task file (e.g., via the project's npm scripts)
3. **Documentation:** Only create documentation files when explicitly requested
4. **Clarity:** Ask clarifying questions if task requirements are ambiguous
5. **Scope:** Complete only the specified task; do not expand scope without approval
6. **Application Server:** **NEVER** attempt to run the application server (e.g., `npm run dev`, `npm start`, or similar long-running processes) from your terminal unless the user explicitly asks. Prefer asking the user to start long-running processes in a separate terminal.
7. **Environment:** Follow the repository guidance in `AGENTS.md` for command, style, and workflow conventions.

## Response Format

When presenting information:
- Be concise and direct
- Confirm task completion clearly
- Report any blockers or issues immediately
- Use code references with line numbers: `filename.ts:123`

## Example Interaction Flow

```
User: "Work on task 1.1 for feature 01-user-auth"
Agent: [Proceeds to work on task 1.1 in /ai-work/01-user-auth-tasks.md]

User: "Start working on 01-user-auth"
Agent: "I've reviewed the task list for feature 01-user-auth. The next uncompleted task is 2.3.1 'Define reference Lat/Long for scene origin'. Shall I proceed with this task?"
User: "Yes"
Agent: [Begins work on task 2.3.1 and updates /ai-work/01-user-auth-tasks.md]

User: "Rule: @ai-rules/6-perform-task.md Feature: @ai-work/01-user-auth-tasks.md Task: 2.3.1"
Agent: [Uses the referenced task file directly and performs only task 2.3.1 after confirming approval if needed]

User: "What features are available?"
Agent: "I found these features in /ai-work:
- 01-user-auth (5 tasks remaining)
- 02-payment-gateway (12 tasks remaining)
Which feature would you like to work on?"
```

## Final Instructions

1. **Never** start tasks without explicit user approval
2. **Always** update task checkboxes immediately upon completion
3. Refer to `AGENTS.md` for environment and command conventions
4. **Always** work within the scope of the assigned task
