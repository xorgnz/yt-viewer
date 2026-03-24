# AGENTS.md

## Project Workflow

- Do not begin implementation or multi-step work without an explicit user request.
- If the target feature or task is unclear, ask one concise clarification before proceeding.
- Work step-by-step and avoid combining unrelated changes in a single pass.
- Prefer repo-aware tools and minimal, traceable edits over broad rewrites.
- You may refer to repository files directly with `@` file references when the UI supports them.
- For rule-driven work, prefer short requests such as `Rule: @ai-rules/5-create-tasks.md` and `Feature: 01-some-feature`.
- Any time the user asks you to execute a rule, look through the relevant instructions in `ai-rules` before proceeding.

## Environment

- This project is run with Node on Windows, not WSL.
- Use commands that work in the current Windows shell environment unless the user explicitly asks for an alternative.
- Use Windows paths when executing local commands. Forward-slash paths are fine in documentation and code when the underlying tool supports them.
- Keep commands non-interactive when feasible.

## Execution Constraints

- Do not start long-running processes in-session, including dev servers, watchers, or persistent background jobs, unless the user explicitly asks.
- If a command may be slow, state the purpose briefly before running it.
- If reproducing an issue depends on a local dev server or another environment-sensitive command that is easier for the user to run directly, prefer asking the user to run it and share the output rather than spending time fighting local shell or process-capture limitations.
- Follow higher-priority system, developer, and tool instructions when they conflict with repository guidance.

## Editing Expectations

- Prefer small, focused changes that match the existing codebase patterns.
- Preserve unrelated user changes in the worktree.
- When practical, validate changes with targeted checks or tests that do not require long-running processes.

## JavaScript Style

- Use 4-space indentation. Do not use tabs for indentation.
- Put opening braces on a new line for functions, methods, conditionals, loops, and classes unless an existing file clearly follows a different local convention.
- Prefer simple functions and methods where practical.
- Favor straightforward control flow and small units of logic over clever or densely abstracted code.
- Add brief comments before each logical block of code to orient the reader.
- Keep comments short and directional. Do not restate obvious code behavior unless an obscure or complex algorithm needs explanation.
- Precede standalone comments with a blank line.
- End-of-line comments are acceptable in short declaration blocks. Align those comments to a consistent visual column so they remain tidy.
