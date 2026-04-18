---
version: 1.2.0
timestamp: 2026-04-18 00:00
---
# Rule: Running Project Validation And Tests

## Core Principle

Identify available validation commands first, then determine which command the user wants to run, then run it.

- Do not invent commands that are not present in the repository.
- Use one-shot commands; do not start watch mode or long-running processes unless the user explicitly asks.
- Treat validation-option prompts as selection prompts, not approval gates.
- Do not ask an extra `Approve this? Y/N.` question for routine validation commands under normal workspace permissions.

## Process

1. **Identify Available Commands**
    - Inspect the repository for validation commands before choosing anything.
    - Start with obvious project command sources such as `package.json`, project README files, and documented tooling files.
    - Include only commands that are actually available in the current repository.
    - Prefer documented project commands over ad hoc shell invocations.

2. **Determine The Command To Run**
    - If the user named a specific available command, run that command.
    - If the user's command is non-specific, ask them to choose from the available commands.
    - Put the most recently selected validation command first when one exists in the current conversation.
    - If there is no previous selection, put the best default first based on project documentation and common command names.
    - Prefer a lightweight project check as the default when one is available.

3. **Run The Selected Command**
    - Run the selected one-shot command.
    - Track whether it passed, failed, or could not run.
    - Do not continue into additional validation commands unless the user selected them or the selected option explicitly contains a command group.

4. **Report Results**
    - State exactly which command ran.
    - State whether it passed, failed, or could not run.
    - Summarize important failures with enough detail to act on them.
    - If no validation commands are available, say so directly.

## Selection Prompt Format

When asking the user to choose a validation option, use a concise numbered list:

```text
Validation options:
1. <recommended or previous command> (Recommended/default)
2. <alternate command>
```

If a validation command was already selected earlier in the conversation, make that option first and mark it as previous/default.

## Examples

```text
Validation options:
1. npm run test (previous)
2. npm run check (default)
3. npm run typecheck
```
