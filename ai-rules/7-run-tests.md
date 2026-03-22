---
version: 1.0.0
timestamp: 2026-03-22 13:20
---
# Rule: Running Project Validation and Tests

## Goal

To guide an AI assistant in selecting and running the appropriate validation commands for the current work, starting with the repository's current checks and expanding cleanly as additional test suites are introduced.

## When to Use

Use this rule when the user asks to run tests, validate a change, verify completed work, or execute a quality check before or after implementation.

## Prerequisites

- Follow the repository guidance in `AGENTS.md`
- Review the relevant task file at `/ai-work/{feature-tag}-tasks.md` when working against a specific feature
- Review `/ai-work/00-master-techstack.md` if it exists to understand shared testing and tooling decisions
- Inspect the repository's actual scripts and available test tooling before choosing commands

## Core Principle

The AI must run the smallest set of meaningful validation commands that matches the user's request and the scope of the change.

- Start with the repository's primary project validation command
- Add more targeted or broader test commands only when they are relevant
- Prefer fast, focused checks before full-suite validation when appropriate
- Do not invent commands that are not present in the repository
- When the user asks to "run tests" or invoke this rule without specifying a validation scope, the AI should ask which test option to use instead of assuming one

## Current Baseline for This Repository

At the time this rule was written, the primary validation command is:

- `npm run check`

Additional project validation commands may also exist, such as:

- `npm run test`
- `npm run typecheck`
- Other framework-specific or tool-specific test scripts added later

The AI must confirm the currently available scripts before running anything.

## Process

1. **Identify the Validation Scope**
    - Determine whether the user wants:
        - a quick validation pass
        - validation for a specific task or feature
        - targeted test execution for changed files
        - a broader full-project verification
    - If the user did not specify which validation option to use, ask a short clarification that lists the available options as a numbered list and marks a default
    - The default should be the most recently used validation option in the current conversation when one exists
    - If there is no prior validation command in the current conversation, default to the repository's primary validation command
    - Always present the default as option `1`

2. **Inspect Available Commands**
    - Review `package.json` scripts and any documented testing commands in:
        - `AGENTS.md`
        - `/ai-work/00-master-techstack.md`
        - `/ai-work/{feature-tag}-tasks.md` when applicable
    - Prefer documented commands over ad hoc shell invocations when both exist

3. **Choose the Smallest Appropriate Command Set**
    - For a lightweight validation request, run the main validation command first
    - For implementation work, run commands that match the type of change:
        - static validation for type or framework issues
        - unit tests for logic changes
        - integration or end-to-end tests if those suites exist and are relevant
    - If multiple commands are warranted, run them in a sensible order from fastest to broadest

4. **Respect Environment Constraints**
    - Use Windows-compatible, non-interactive commands in this repository
    - Do not start long-running watch processes unless the user explicitly asks
    - Prefer one-shot commands such as `npm run check` or `npm run test`

5. **Execute and Capture Results**
    - Run the selected commands
    - Record whether each command:
        - passed
        - failed
        - could not run
    - Summarize the relevant output for the user instead of dumping unnecessary noise

6. **Handle Failures Pragmatically**
    - If a command fails, report:
        - the command that failed
        - the relevant error summary
        - whether the failure appears related to the current work
    - If one validation step fails, decide whether running additional checks is still useful
    - Do not claim the work is validated if critical checks failed or were skipped

7. **Report Coverage Gaps**
    - If no relevant tests exist for the changed area, say so explicitly
    - If the repo only supports static validation at the moment, say that clearly
    - If broader test coverage would be valuable, note that as a gap rather than pretending it exists

## Selection Guidance

### Quick Validation

Use the primary repository validation command.

For this repository today, that usually means:

- `npm run check`

If the user says "run tests" without further detail, ask before running anything. Example:

- `Validation options: 1. npm run check (Recommended/default) 2. npm run test`

If a validation command was already used earlier in the conversation, make that the default instead. Example:

- `Validation options: 1. npm run check (previous/default) 2. npm run test`
- If the UI does not support an empty reply, the user should be able to answer with the number of the desired option

### Task or Feature Validation

Use commands relevant to the feature or task being worked on. Examples:

- UI or framework changes: run the framework check command first
- Shared logic changes: run unit tests if they exist
- Data or server route changes: run relevant unit or integration tests if they exist

### Full Validation

Run the broadest meaningful set of one-shot validation commands available in the repo, typically including:

- primary framework or compile-time checks
- unit test suite
- other non-watch verification commands documented by the project

## Output Expectations

When reporting results to the user:

- Be concise and direct
- State exactly which command or commands were run
- State whether each one passed or failed
- Summarize the important failures with enough detail to act on them
- If nothing applicable was available beyond `npm run check`, say that explicitly

## Example Interaction Flow

```
User: "Run tests for this project"

AI: [Checks package.json and current docs]
AI: "Validation options:
1. `npm run check` (Recommended/default)
2. `npm run test`"
User: "1"
AI: [Runs npm run check]
AI: "Ran `npm run check`. It passed."
```

```
User: "Validate feature 01-user-auth"

AI: [Reviews the feature task file, master tech stack, and package.json]
AI: [Runs the relevant one-shot commands]
AI: "Ran `npm run check` and `npm run test`. `npm run check` passed. `npm run test` failed in `src/lib/auth/admin.test.ts` due to ..."
```

## Final Instructions

1. Always inspect the repository's current validation commands before choosing what to run
2. If the user did not specify which validation command to run, ask them to choose from the available options before running anything
3. Treat the most recently used validation command in the current conversation as the default when asking the user to choose
4. Treat `npm run check` as the baseline fallback default when no prior validation choice exists
5. Default to the smallest meaningful validation set, not the largest possible set
6. Expand to additional test suites as they are added and documented
7. Never use watch-mode or long-running validation commands unless the user explicitly asks
8. Present validation choices as numbered options and place the default as option `1`
