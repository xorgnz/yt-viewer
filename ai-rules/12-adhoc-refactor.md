---
version: 1.1.0
timestamp: 2026-04-30 00:00
---
# Rule: Ad Hoc Refactoring and Tidying

## Purpose

Use this rule when the user wants the agent to find a small, self-contained cleanup or refactoring task that fits into a short work session without opening a larger batch of new feature work.

## Scope

This rule is for small non-feature implementation improvements such as:

- local cleanup
- small refactors
- dead code removal
- naming cleanup
- minor structure improvements
- similar low-risk tidying work with no intended product-scope expansion

Do not use this rule to start new feature work or broad architectural rewrites.

## Process

### Inspect

1. Inspect the codebase to identify a small number of plausible tidying or refactoring tasks
   - If `/ai-work/00-architecture.md` exists, read it first and use it to judge whether code structure aligns with the intended architecture
2. Prefer candidates that are:
   - small enough to complete in one focused pass
   - low risk
   - easy to describe clearly
   - useful without requiring major follow-on work
3. Exclude tasks that would:
   - materially expand scope
   - require broad cross-project coordination
   - depend on unclear product decisions
   - leave the codebase half-migrated if stopped midway

### Propose

4. Present a short list of candidate tasks for the user to choose from
5. For each candidate, briefly state:
   - what would be changed
   - why it is worthwhile
   - the expected scope or affected area
6. Keep the list small. Prefer 2-4 candidates rather than a long backlog dump
7. Do not begin implementation until the user selects one candidate explicitly

### Execute

8. After the user selects a candidate, complete only that selected tidy/refactoring task
9. Keep the implementation narrowly scoped to the selected change
10. Validate the change appropriately for its risk and scope
11. Do not silently expand into neighboring cleanup unless the user approves that added scope
12. If the selected refactor materially clarifies or changes architectural boundaries, update `/ai-work/00-architecture.md` as part of the same work

### Review Handoff

13. When implementation is done, tell the user the refactoring task is complete
14. Ask the user to review the code before committing
15. Do not proceed to commit until the user has had that review handoff

### Commit

16. After the review handoff, use rule `08-prepare-commit.md` to prepare the commit
17. Default to a `tidy` commit unless the actual diff clearly fits a different rule-8 prefix better
18. Follow rule 8's normal scope inspection and approval behavior before committing

## Candidate Selection Guidance

Good candidates usually have one or more of these properties:

- duplicated logic that can be simplified safely
- stale or dead code that can be removed confidently
- confusing local structure that can be clarified without changing behavior
- components, classes, or modules whose responsibility boundary is weak, porous, vague, or poorly justified
- components, classes, or modules that appear to do more than one job without a clear reason
- opportunities to harden boundaries so each component does one thing, except where its one clear responsibility is to coordinate, facilitate, or aggregate related behavior
- small naming or organization issues that materially improve readability
- missing, stale, or inconsistent documentation that makes the implementation harder to understand or maintain
- code quality or formatting cleanup that materially improves readability and maintainability without changing behavior
- tangled, dense, or overly complicated expressions that can be rewritten more clearly
- minor test cleanup that improves maintainability

Avoid candidates that are mainly speculative or aesthetic unless they clearly improve maintainability.

## Output Expectations

When proposing candidate tasks, present them as clear options the user can choose from.

When the selected task is complete, explicitly say the implementation is done and ask the user to review the code.

When moving to commit preparation, make it clear that rule 8 is being used for the commit step.
