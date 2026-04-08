<!-- BEGIN: Shared Downstream Guidelines -->
# Shared Downstream Guidelines

This file is the shared base for downstream agent guidelines.

At deployment time, combine this file with exactly one agent-specific file from `downstream/guidelines/` and exactly one environment-specific file from `downstream/environments/`.

When needed, you may also append one or more technology-specific overlays from `downstream/toolsets/`.

## Project Workflow

- Do not begin implementation or multi-step work without an explicit user request.
- If the target feature or task is unclear, ask one concise clarification before proceeding.
- Work step-by-step and avoid combining unrelated changes in a single pass.
- Prefer repo-aware tools and minimal, traceable edits over broad rewrites.
- You may refer to repository files directly with `@` file references when the UI supports them.
- For rule-driven work, prefer short requests such as `Rule: @ai-rules/5-create-tasks.md` and `Feature: 01-some-feature`.
- If the user says `rule 1`, `rule 2`, `rule 3`, and so on, treat that as an instruction to run the corresponding downstream rule rather than merely describing it.
- Any time the user asks you to execute a rule, look through the relevant instructions in `ai-rules/` before proceeding.
- After recognizing a numbered rule invocation, parse the remaining tokens against that rule's documented arguments before applying generic feature, task, branch, or free-form inference.
- If a token matches both a reserved rule argument and a possible feature alias, branch name, task label, or free-form description, prefer the reserved rule argument unless the user explicitly identifies the other target, for example with `feature <tag>`.
- Shortcut workflow phrases documented in `ai-rules/` may also be used directly. For example, `Run the 6-7-8 subtask flow for task 3` refers to the workflow defined in `@ai-rules/00-subtask-flow-6-7-8.md`.
- Branch-sensitive rules should use `/ai-work/00-workflow-config.md` as the source of truth for whether branch-based feature workflow is `required` or `optional`.
- If a branch-sensitive rule needs that config and it is missing, ask the user which mode to use, write the answer to `/ai-work/00-workflow-config.md`, and then continue.
- In `branch_mode: optional`, branch operations are advisory unless the user explicitly asks for them or a specific rule says otherwise.

## Approval Style

- When a downstream rule requires user approval, ask for it with this exact question: `Approve this? Y/N.`

## Tone

- Be clear, direct, and technically precise, but do not default to a cold or mechanical tone.
- Prefer a mildly warm, personable style that feels collaborative and human while staying concise.
- Keep that tone lightweight. Do not add fluff, exaggerated enthusiasm, or unnecessary filler.

## Environment-Agnostic Defaults

- Keep commands non-interactive when feasible.
- Consider the consequences of running commands in parallel before attempting to do so.

## Execution Constraints

- Do not start long-running processes in-session, including dev servers, watchers, or persistent background jobs, unless the user explicitly asks.
- If a command may be slow, state the purpose briefly before running it.
- If reproducing an issue depends on a local dev server or another environment-sensitive command that is easier for the user to run directly, prefer asking the user to run it and share the output rather than spending time fighting local shell or process-capture limitations.
- Do not run Git state-changing commands and Git state-inspection commands at the same time. Commands such as `git add`, `git commit`, and `git status` should be run as separate sequential shell invocations rather than in parallel or in a single chained command.
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
<!-- END: Shared Downstream Guidelines -->

<!-- BEGIN: Codex Agent Overlay -->
# Codex-Specific Downstream Notes

Combine this file with `downstream/guidelines/shared.md` at deployment time.

There are currently no Codex-specific behavior overrides beyond the shared downstream guidance.
<!-- END: Codex Agent Overlay -->

<!-- BEGIN: Windows Environment Overlay -->
# Windows Environment Notes

Use this overlay when the downstream project is being run from a Windows shell environment.

This means native Windows shell usage, not WSL, unless the target repository explicitly says otherwise.

## Commands And Paths

- Use commands that work in the current Windows shell environment unless higher-priority instructions require an alternative.
- Use Windows paths when executing local commands. Forward-slash paths are fine in documentation and code when the underlying tool supports them.
- In PowerShell, do not chain command steps with `&&`; run sequential commands as separate shell invocations instead.

## Runtime Assumptions

- Assume the project is being run with Node on Windows unless the target repository clearly documents a different local runtime expectation.
- Treat `windows` and `wsl` as distinct environment choices. Do not assume WSL behavior when the selected environment is Windows.
<!-- END: Windows Environment Overlay -->

<!-- BEGIN: TypeScript + SvelteKit Toolset Overlay -->
# TypeScript + SvelteKit Toolset Notes

Use this overlay when the downstream project is primarily built with TypeScript and SvelteKit.

## Toolset Expectations

- Prefer TypeScript over plain JavaScript for application and library code unless the target repository clearly uses JavaScript in the relevant area.
- Preserve the existing SvelteKit project structure and naming conventions unless the task explicitly requires restructuring.
- Prefer SvelteKit-native patterns for routing, data loading, form actions, and endpoint handling over custom framework abstractions.
- Follow the existing `tsconfig.json`, `svelte.config.*`, and formatter/linter settings in the target repository rather than imposing new defaults.

## TypeScript

- Prefer explicit types where they materially improve readability or catch edge cases, especially for exported functions, public interfaces, and complex data shapes.
- Avoid introducing broad `any` usage unless the surrounding code already relies on it and tightening types is outside the requested scope.
- Keep helper types readable; avoid type-level cleverness unless the existing codebase already uses that style.

## SvelteKit

- Prefer `+page`, `+layout`, `+page.server`, `+server`, and related SvelteKit file conventions instead of custom routing layers.
- Keep server-only code out of client bundles.
- For load functions and actions, prefer straightforward data flow and explicit error handling over deeply abstracted helper wrappers.
- When editing Svelte components, preserve reactivity semantics and keep state flow easy to trace.

## Validation

- When practical, prefer targeted checks that fit the stack, such as TypeScript checking, Svelte checks, or focused test runs already defined by the target repository.
<!-- END: TypeScript + SvelteKit Toolset Overlay -->
