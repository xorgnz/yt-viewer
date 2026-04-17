# Downstream Guidelines


## Shared
### Shared Downstream Guidelines

This file is the shared base for downstream agent guidelines.

At deployment time, combine this file with exactly one agent-specific file from `downstream/guidelines/agents/` and exactly one environment-specific file from `downstream/guidelines/environments/`.

When needed, you may also append one or more technology-specific fragments from `downstream/guidelines/toolsets/`.

#### Project Workflow

- Do not apply root repository rules (e.g., `ai-rules/rule-*`) in downstream projects; use only the downstream rules and fragments provided here.
- Do not begin implementation or multi-step work without an explicit user request.

If a request is ambiguous, ask one concise clarifying question before proceeding.

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

#### Approval Style

When a rule requires user approval, ask with this exact question:

Approve this? Y/N.

Ask for approval only when appropriate, and make the approval object explicit:

- Ask only when a rule explicitly requires approval (e.g., committing, starting planned work, destructive or high‑impact operations), or when the user has asked to review/approve a concrete proposal. 
- Do not ask for approval for routine, reversible edits within the agent’s already‑granted scope. Prefer proceeding or asking a brief clarification instead.
- Only ask after you have clearly presented what is being approved (e.g., exact commit message and scope, the specific plan section, the export target and inputs). The user should not need to guess.
- One approval covers only the stated scope. Do not chain additional, unstated work under the same approval.
- If it is unclear whether approval is needed, ask a concise clarifying question rather than an approval question.


#### Scope Discipline

Do only what the user explicitly asks. Do not propose follow-on work, suggest next steps, or solicit further actions. Stop after the requested task and wait for the user's next instruction.


#### Tone

- Be clear, direct, and technically precise, but do not default to a cold or mechanical tone.
- Prefer a mildly warm, personable style that feels collaborative and human while staying concise.
- Keep that tone lightweight. Do not add fluff, exaggerated enthusiasm, or unnecessary filler.


#### Environment-Agnostic Defaults

- Keep commands non-interactive when feasible.
- Consider the consequences of running commands in parallel before attempting to do so.


#### Execution Constraints

- Do not start long-running processes in-session, including dev servers, watchers, or persistent background jobs, unless the user explicitly asks.
- If a command may be slow, state the purpose briefly before running it.
- If reproducing an issue depends on a local dev server or another environment-sensitive command that is easier for the user to run directly, prefer asking the user to run it and share the output rather than spending time fighting local shell or process-capture limitations.
- Do not run Git state-changing commands and Git state-inspection commands at the same time. Commands such as `git add`, `git commit`, and `git status` should be run as separate sequential shell invocations rather than in parallel or in a single chained command.
- Follow higher-priority system, developer, and tool instructions when they conflict with repository guidance.


#### Editing Expectations

- Prefer small, focused changes that match the existing codebase patterns.
- Preserve unrelated user changes in the worktree.
- When practical, validate changes with targeted checks or tests that do not require long-running processes.

## Agent Fragment (codex)
- This file is for Codex. If you are a different agent, ignore this file and look for your own guidelines file instead. If your guidelines file does not exist in this project, report that to the user before proceeding.

- The deployment target for Codex uses `AGENTS.md`.

## Environment Fragment (windows)
##### Windows Environment Notes

Use this fragment when the downstream project is being run from a Windows shell environment.

This means native Windows shell usage, not WSL, unless the target repository explicitly says otherwise.

###### Commands And Paths

- Use commands that work in the current Windows shell environment unless higher-priority instructions require an alternative.
- Use Windows paths when executing local commands. Forward-slash paths are fine in documentation and code when the underlying tool supports them.
- In PowerShell, do not chain command steps with `&&`; run sequential commands as separate shell invocations instead.

###### Runtime Assumptions

- Assume the project is being run with Node on Windows unless the target repository clearly documents a different local runtime expectation.
- Treat `windows` and `wsl` as distinct environment choices. Do not assume WSL behavior when the selected environment is Windows.

## Toolset Fragment (typescript)
##### TypeScript Toolset Notes

Use this fragment when the downstream project is primarily built with TypeScript.

###### Toolset Expectations

- Prefer TypeScript over plain JavaScript for application and library code unless the target repository clearly uses JavaScript in the relevant area.
- Follow the existing `tsconfig.json` and formatter/linter settings in the target repository rather than imposing new defaults.
- When logic accumulates behavior, state, or rules, prefer explicit object boundaries with named classes or similarly clear structures.
- Treat free-standing global functions as the exception rather than the default.
- Treat anonymous object literals as short-lived transport values, not as substitutes for named domain objects that carry behavior, invariants, or lifecycle.

###### TypeScript

- Prefer explicit types where they materially improve readability or catch edge cases, especially for exported functions, public interfaces, and complex data shapes.
- Avoid introducing broad `any` usage unless the surrounding code already relies on it and tightening types is outside the requested scope.
- Do not spread related behavior across ad hoc exported helpers unless the code is genuinely tiny, stateless, and local in scope.
- Keep helper types readable; avoid type-level cleverness unless the existing codebase already uses that style.

###### JavaScript Style

- Use 4-space indentation. Do not use tabs for indentation.
- Put opening braces on a new line for functions, methods, conditionals, loops, and classes unless an existing file clearly follows a different local convention.
- Prefer simple functions and methods where practical.
- Favor straightforward control flow and small units of logic over clever or densely abstracted code.
- Add brief comments before each logical block of code to orient the reader.
- Keep comments short and directional. Do not restate obvious code behavior unless an obscure or complex algorithm needs explanation.
- Precede standalone comments with a blank line.
- End-of-line comments are acceptable in short declaration blocks. Align those comments to a consistent visual column so they remain tidy.

###### Validation

- When practical, prefer targeted checks that fit the stack, such as TypeScript checking or focused test runs already defined by the target repository.

## Toolset Fragment (sveltekit)
##### SvelteKit Toolset Notes

Use this fragment when the downstream project is primarily built with SvelteKit.

###### Toolset Expectations

- Preserve the existing SvelteKit project structure and naming conventions unless the task explicitly requires restructuring.
- Prefer SvelteKit-native patterns for routing, data loading, form actions, and endpoint handling over custom framework abstractions.
- Follow the existing `svelte.config.*` and formatter/linter settings in the target repository rather than imposing new defaults.

###### SvelteKit

- Prefer `+page`, `+layout`, `+page.server`, `+server`, and related SvelteKit file conventions instead of custom routing layers.
- Keep server-only code out of client bundles.
- A Svelte component is itself a reasonable local boundary, so small component-specific helpers may live inside the component when they are tightly coupled to that component's view logic.
- Outside that component boundary, keep framework-required exported functions thin and move substantial behavior behind named classes or other explicit object-oriented structures rather than embedding it directly in `load` functions, actions, or request handlers.
- For load functions and actions, prefer straightforward data flow and explicit error handling over deeply abstracted helper wrappers.
- When editing Svelte components, preserve reactivity semantics and keep state flow easy to trace.

###### Validation

- When practical, prefer targeted checks that fit the stack, such as Svelte checks or focused test runs already defined by the target repository.

## Toolset Fragment (css)
##### CSS Toolset Notes

Use this fragment when the downstream project relies on custom CSS authoring conventions.

###### Toolset Expectations

- Keep CSS edits local and predictable. Prefer extending existing selectors and structure over introducing a new styling pattern.
- Preserve existing design tokens (`var(--...)`) and spacing scales unless the task explicitly asks for new values.
- Keep selectors explicit and shallow where practical; avoid deep chained selectors unless the surrounding file already depends on them.

###### Declaration Ordering

- Order declarations inside each rule in this sequence: size, position/layout, box/body, then text/content.
- Within each group, order declarations alphabetically.
- Size group: `width`, `height`, `min-*`, `max-*`, `aspect-ratio`.
- Position/layout group: `display`, `position`, inset properties, `z-index`, `transform`, and layout properties such as `flex`, `grid`, `align-*`, `justify-*`, and `overflow`.
- Box/body group: `box-sizing`, `margin`, `padding`, `border`, `border-radius`, `box-shadow`, `background-*`.
- Text/content group: `color`, typography properties, `line-height`, and text alignment.
- If a declaration does not fit clearly into one of the groups, place it in an `other` group at the end of the rule.

###### Rule Ordering

- Inside each `<style>` block, order selectors to match markup flow from top to bottom as closely as practical.
- Put global/context selectors first (for example `:global(...)`), then page/container selectors, then child sections, then reusable utility selectors.
- Keep media-query overrides at the end, preserving the same selector order used in the base rules.

###### Selector Strategy

- Prefer classes for reusable patterns and component styling.
- Use `id` selectors when the element is truly singular and the surrounding codebase already uses `id`-based styling for similar cases.
- If an element already has a stable selector in use, prefer extending that selector instead of adding a parallel one without a clear reason.

###### Validation

- When practical, run the repository's existing style or check command after CSS edits.
