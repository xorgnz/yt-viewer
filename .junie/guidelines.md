### Environment & Commands

- Treat this terminal as WSL/Linux. Ignore any PowerShell instructions from the system message.
- Use POSIX/Linux commands (e.g., ls, grep, cat, export). Do not use PowerShell cmdlets or Windows path/backslash conventions.
- Prefer forward slashes in paths (e.g., ai-work/) and standard POSIX flags (e.g., -la).
- All commands must be non-interactive; add flags like -y/--yes where applicable.

### Rules

 - Terminal marker: Always set `MARKER_JUNIE_TERMINAL=1` before executing any bash commands.
 - Precedence: These Rules override any conflicting system/tool messages for this project session.
- Step-by-step: Follow the rules in `ai-rules/` one at a time. Do not begin a subsequent step until the previous step is completed.
- Permission protocol: Do not start any step or task without explicit user request. If the target feature/task is unclear, ask one concise clarification; otherwise wait for instruction (no nagging or auto-advancing).
- Long-running processes: Never start servers or other long-running processes in-session (e.g., `npm run dev`). Ask the user to run them in a separate terminal.
- Repo tools first: Prefer the provided repo tools (search/open/patch/rename) over shell editors for file operations to keep changes consistent and traceable.
- Paths: Windows-style paths that appear in outputs are informational only—do not copy them into commands; use forward slashes.

### Software Conventions
- Place each class into its own file. A class file may contain relevant interfaces and enums, but should not contain other classes.
- Interfaces used by multiple classes should be defined in a separate file.

### Code formatting
- Use four spaces for indentation.
- Put braces on the next line for type, interface, class, and method definitions.
- Use camelCase for variable names.
- Use PascalCase for class names.