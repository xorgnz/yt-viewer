---
version: 2.2.0
timestamp: 2026-05-17 00:00
---
# Rule: Summarize Recent Changes Into the Changelog

## Purpose

Use this rule when the user wants the agent to summarize recent work into `/ai-work/changes/changes-input.md`.

This rule covers both:

- immediate changelog capture after a commit or small batch of commits
- later periodic summarization of multiple recent commits since the last release tag

This rule is the source of truth for changelog note capture, categorization, and commit-coverage tracking.

## Core Principle

Changelog updates and commit preparation are separate concerns.

- Use rule `08-prepare-commit.md` for commit messages and commit scope.
- Use this rule for changelog decision-making, changelog edits, and recent-history reconciliation.
- Deploy or generation workflows may consume and validate changelog notes, but they must not invent them.

## File Contract

- Use the repository-root path `/ai-work/changes/changes-input.md`.
- Treat the file as a markdown document organized into these canonical release buckets, in this order:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Removed`
  - `Internal`
- Use one markdown heading per canonical bucket.
- Store stakeholder-facing note bullets under the appropriate category heading.
- Track covered commits per changelog bullet using a trailing HTML comment on the same line:
  - `<!-- changelog-commits: <sha> <sha> ... -->`
- Use short Git commit ids as stored by `git rev-parse --short`, unless the repository already uses a different stable local convention.
- The coverage marker is part of the file contract. Keep it aligned with the bullet it describes.
- If `/ai-work/changes/` does not exist, create it.
- If `/ai-work/changes/changes-input.md` does not exist, create it with the canonical category headings before writing the first approved entry.
- Do not use JSON or frontmatter in this file.
- Preserve the canonical category set unless the user explicitly asks to change the changelog schema.

## Review Scope

- Review the changelog against a user-specified commit range when one is provided.
- Otherwise default to the commits after the most recent release-style Git tag and state that range explicitly before proposing edits.
- Prefer a bounded recent range over the full repository history unless the user explicitly asks for a full-history review.

### Default Tag Anchor

- Treat the most recent release-style Git tag as the default lower bound for review.
- A release-style tag normally looks like `v0.0.1`, `v1.2.3`, or a similar `v*` version tag.
- When multiple tags are present, use the most recent matching tag reachable in the current branch history.
- Review commits after that tag through `HEAD` unless the user specifies a different range.
- If no suitable release-style tag exists, do not silently review all history by default. Ask the user which range to use, or whether to review from the beginning.

## Outcome Choices

Choose exactly one outcome for each relevant commit or commit cluster:

1. `ignore`
   - Use this when the change is not worth recording for stakeholders.
2. `add`
   - Use this when the change should create a new stakeholder-facing bullet.
3. `revise`
   - Use this when updating a prior bullet is a better representation than adding another one, for example when later commits materially refine, complete, fix, or clarify the same stakeholder-facing change already listed.

## Category Selection

When the outcome is `add` or `revise`, choose exactly one changelog category for the resulting bullet:

- `Added`
  - New user-facing functionality or newly available workflow capability.
  - Best fit for "you can do something new now."
- `Changed`
  - Existing behavior, workflow, UI, or implementation-visible behavior changed intentionally and materially.
  - Best fit for "this works differently now."
- `Fixed`
  - Broken, inconsistent, unstable, or unintended behavior was corrected.
  - Best fit for regressions, defects, rendering or input issues, and reliability repairs.
- `Removed`
  - Functionality, support, or an existing path that used to exist was intentionally taken away or disabled.
  - Best fit for explicit removals and completed deprecations by deletion.
- `Internal`
  - Release-relevant non-user-facing maintenance or operational change.
  - Best fit for work worth recording in release history even though it is not normal user-facing product behavior.

## Category Decision Guidance

- Choose the category by release story and user effect, not by file type.
- A UI file change is not automatically `Changed`.
- A backend or service-layer change is not automatically `Internal`.
- Keep an explicit boundary between:
  - `Changed`: intentional behavior evolution
  - `Fixed`: correcting something wrong, broken, unstable, or inconsistent
- Keep `Removed` explicit instead of folding removals into `Changed`.
- Reserve `Internal` for release-relevant non-user-facing work that is still worth carrying into release history.
- If a non-user-facing change is not worth recording for release history, use `ignore` instead of `Internal`.

## Inclusion Rules

- Record a change only when the relevant change is something project stakeholders are likely to care about at deploy time.
- Ignore clearly administrative or agent-facing work such as:
  - rule or guideline maintenance
  - planning or board or status updates
  - AI workflow or prompt-file updates
  - repository-only housekeeping with no meaningful product or operational effect for stakeholders
- Use `Internal` only when a non-user-facing change is still meaningfully release-relevant for stakeholders, operators, or release history.
- Do not record an ignored change unless the user explicitly asks for an exception.

## Matching Guidance

- Use commit subjects, scoped diffs, and surrounding commit context to compare committed work against existing changelog bullets.
- Allow one changelog bullet to represent multiple closely related commits when that gives the clearest stakeholder-facing summary.
- Look for opportunities to merge discontiguous but related commits into one changelog bullet when they clearly describe the same stakeholder-facing change, even if unrelated commits appear in between.
- A later bug fix, polish pass, follow-up tweak, or completion step may justify revising an earlier bullet instead of adding another one when the combined story is clearer for stakeholders.
- Allow a `revise` action to move an existing bullet from one category to another when the current category no longer matches the stronger release story.
- Do not require feature tags or task ids in every bullet, but use them as supporting evidence when they are present.

## Covered Commit Rules

- Treat a commit as already captured when its short id appears in a bullet's `<!-- changelog-commits: ... -->` marker.
- Do not propose a second bullet for a covered commit unless the user explicitly asks to revisit prior changelog decisions.
- If a later commit clearly belongs with an existing bullet, prefer `revise` and extend that bullet's coverage marker instead of creating a duplicate story.
- If multiple existing bullets plausibly cover the same new commit, do not infer. Present the candidates and ask the user to choose.
- If the changelog contains bullets without coverage markers, treat those bullets as human-readable content but not as reliable commit coverage evidence. Use commit history and surrounding text to infer likely matches, then propose `revise` actions that add the missing coverage markers when appropriate.

## Change Message Rules

- When the outcome is `add` or `revise`, write the bullet text for non-technical project stakeholders first, while keeping concrete product or operational detail where practical.
- Describe what changed, where it matters, and any important user-visible or operational effect without falling back to vague engineering shorthand.
- Do not simply copy a commit description. Expand it into stakeholder-readable language when the source text is too terse to stand alone.
- Keep the entry to one concise sentence unless two short sentences are clearly needed.
- Do not prefix every entry mechanically with feature tags or task ids.
- Mention feature tags, feature names, task ids, or task wording in the text when they are useful for clarity, traceability, or release communication.
- When the outcome is `revise`, preserve the intent of the earlier bullet while updating it to reflect the newer combined state more accurately.

## Process

### Inspect

1. Read `/ai-work/changes/changes-input.md` when it exists.
2. Determine the commit range to review, using the user's explicit range when provided or the most recent release-style Git tag as the default anchor when available.
3. Inspect the commits in that range.
4. Read existing `changelog-commits` coverage markers and build the set of already covered commits.
5. Exclude already covered commits from new `add` proposals unless a `revise` action is the clearer representation.
6. Review the remaining uncovered commits and any relevant covered neighbors for:
   - likely missing bullets
   - likely revision candidates
   - likely commits that should be ignored
   - likely multi-commit groupings that should be represented as one bullet despite unrelated commits appearing between them
7. If an existing bullet appears clearly extraneous, incomplete, duplicated, uncategorized correctly, or missing coverage markers, treat that as a `revise` candidate.

### Propose

8. Present the commit range that was reviewed.
9. Present the proposed changelog actions before writing.
10. Group the proposal into:
   - `add`
   - `revise`
   - `ignore`, for commits reviewed and intentionally left out
11. For each proposed `add` or `revise`, show:
   - the relevant commit or commit cluster, including discontiguous related commits when applicable
   - the reason for the action
   - the proposed category
   - the proposed bullet text
   - the resulting covered commit ids
12. If any mapping remains ambiguous, say so clearly instead of forcing a cleanup decision.
13. Ask `Approve this? Y/N.` before modifying `/ai-work/changes/changes-input.md`, unless the user already provided preapproval in the same command.
14. The approval question must clearly bind to the exact proposed changelog actions.

### Execute

15. Apply only the approved changelog edits.
16. If the approved outcome is `add`, add the approved bullet under the approved category heading in `/ai-work/changes/changes-input.md` and append the approved `changelog-commits` marker on that line.
17. If the approved outcome is `revise`, update the approved existing bullet with the approved replacement text, move it to the approved category if needed, and update its `changelog-commits` marker to include the full approved covered set.
18. If the approved outcome is `ignore`, do not modify `/ai-work/changes/changes-input.md`.
19. Preserve the categorized changelog structure unless the user explicitly asks for broader reformatting.
20. Do not rewrite unaffected bullets for style alone.

### Report

21. Report the commit range that was reviewed.
22. Report how many bullets were added, revised, or removed.
23. Report which commits were newly marked as covered.
24. Report whether any ambiguous or unresolved review items remain.
25. Report whether `/ai-work/changes/changes-input.md` was updated.
