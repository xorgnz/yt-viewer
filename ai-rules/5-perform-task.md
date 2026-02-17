# Rule: Task-Based Development in WSL Environment

## Goal

To guide an AI assistant in executing development tasks from structured task lists while maintaining proper environment configuration, strict approval protocols, and accurate progress tracking.

## Prerequisites

- A feature tag must exist for the work being performed
- A task list must exist at `/ai-work/{feature-tag}-tasks.md`

## Environment Configuration

**CRITICAL - FIRST ACTION:** Before any bash commands are executed (and before bashrc runs), you MUST set the environment variable:

```bash
export MARKER_JUNIE_TERMINAL=1
```

This flag activates the AI-specific environment configuration required for all development work.

## Operating Environment

- **Platform:** WSL (Windows Subsystem for Linux) running Ubuntu
- **Shell:** Bash (default)
- **CRITICAL:** You are operating in a Linux/Unix environment, NOT Windows:
  - Use Unix/Linux commands only (e.g., `ls`, `cd`, `mkdir`, `rm`, `grep`, `find`)
  - Use forward slashes `/` for paths, never backslashes `\`
  - Run commands only in WSL Bash
  - NEVER use PowerShell commands (e.g., `Get-ChildItem`, `Copy-Item`, `Remove-Item`)
  - NEVER use Windows CMD commands (e.g., `dir`, `copy`, `del`)
  - NEVER use `wsl` or `bash -lc` bridging from another shell
  - If Bash isn't available, ask the user to run the command in WSL Bash
  - Use Unix-style package managers (`apt`, `npm`, `pip`) not Windows ones
  - All file paths use Linux conventions (e.g., `/home/user/project` not `C:\Users\...`)
- **Working Directory:** Assume all file paths are relative to the project root unless otherwise specified.

## Task Management Protocol

### Feature Identification

1. **With Feature Tag:** When given a specific feature tag (e.g., "Work on feature 01-user-auth"), use the task file at `/ai-work/01-user-auth-tasks.md`
2. **Without Feature Tag:** If no feature is specified but multiple features exist:
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

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature
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
3. Example: `- [ ] 1.1 Initialize project` � `- [x] 1.1 Initialize project`
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
- Each feature has its own set of files: `{feature-tag}-scope.md`, `{feature-tag}-prd.md`, `{feature-tag}-techstack.md`, `{feature-tag}-tasks.md`
- Always confirm which feature you're working on before starting
- Keep task tracking separate per feature
- Branch names should include the feature tag (e.g., `feature/01-user-auth`)

## General Working Principles

1. **File Operations:** Prefer editing existing files over creating new ones unless creation is explicitly required
2. **Testing:** Run tests as specified in the task file (typically `npx jest [optional/path]`)
3. **Documentation:** Only create documentation files when explicitly requested
4. **Clarity:** Ask clarifying questions if task requirements are ambiguous
5. **Scope:** Complete only the specified task; do not expand scope without approval
6. **Application Server:** **NEVER** attempt to run the application server (e.g., `npm run dev`, `npm start`, or similar long-running processes) from your terminal. These commands will lock up your session. Instead, prompt the user to start the server in a separate terminal process.

## Response Format

When presenting information:
- Be concise and direct
- Confirm task completion clearly
- Report any blockers or issues immediately
- Use code references with line numbers: `filename.ts:123`

## Example Interaction Flow

```
User: "Work on task 1.1 for feature 01-user-auth"
Agent: [Sets MARKER_JUNIE_TERMINAL=1, then proceeds to work on task 1.1 in /ai-work/01-user-auth-tasks.md]

User: "Start working on 01-user-auth"
Agent: "I've reviewed the task list for feature 01-user-auth. The next uncompleted task is 2.3.1 'Define reference Lat/Long for scene origin'. Shall I proceed with this task?"
User: "Yes"
Agent: [Begins work on task 2.3.1 and updates /ai-work/01-user-auth-tasks.md]

User: "What features are available?"
Agent: "I found these features in /ai-work:
- 01-user-auth (5 tasks remaining)
- 02-payment-gateway (12 tasks remaining)
Which feature would you like to work on?"
```

## Final Instructions

1. **Always** set `MARKER_JUNIE_TERMINAL=1` before executing any bash commands
2. **Never** start tasks without explicit user approval
3. **Always** update task checkboxes immediately upon completion
4. **CRITICAL:** Never use PowerShell or Windows CMD commands; this is a WSL/Ubuntu Linux environment - use only Linux/Unix commands
5. **Always** work within the scope of the assigned task
