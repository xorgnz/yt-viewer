---
version: 1.0.0
timestamp: 2026-05-13 00:00
---
# Rule: Reconcile Pending Changelog Entries With Commits

## Purpose

Use this rule when the user wants to review pending stakeholder changelog entries in `/changes/changelog.json` and fill in their commit ids after the related commits already exist.

This rule is intended for deploy-time or release-preparation review, not normal implementation work.

## Core Principle

Treat `/changes/changelog.json` as a queue of stakeholder-facing change notes.

- Rule 8 may append entries with an empty `commit` field.
- This rule reviews those pending entries against Git history and fills commit ids only when the mapping is clear.
- Never invent, approximate, or placeholder-fill a Git commit id.
- Do not invent missing stakeholder messages here.
- Do not silently rewrite stakeholder message text unless the user explicitly asks for editorial cleanup.

## File Contract

- Use the repository-root path `/changes/changelog.json`.
- The file must be a JSON array of objects.
- Each object must contain exactly:
  - `message`
  - `commit`
- A pending entry is an object whose `commit` field is the empty string `""`.
- A resolved entry is an object whose `commit` field contains a real Git commit id.
- Leave `commit` as `""` unless this rule can map the entry to a real existing Git commit id.
- If the file is missing, create `/changes/changelog.json` with `[]` and report that there were no queued entries to reconcile.
- If the file is not valid JSON or is not an array, stop and ask the user how to proceed instead of guessing a repair.

## Relevance Rules

- Treat the entries already present in `/changes/changelog.json` as the source of truth for what should be reconciled.
- Reconcile every pending entry already present in the file, regardless of whether the underlying commit would normally have been excluded at queue time.
- Do not make new editorial inclusion or exclusion decisions in this rule.
- Do not create new entries here for commits that are not already represented in the file unless the user explicitly asks for that.

## Matching Strategy

### Anchoring

1. Read `/changes/changelog.json`.
2. Identify resolved entries and pending entries.
3. If at least one resolved entry exists, use the most recent resolved entry's commit id as the history anchor.
4. When an anchor exists, inspect commits after that anchor through `HEAD`.
5. If no resolved entry exists, inspect recent history in chronological order and use only the smallest plausible trailing commit window that could explain the pending entries.

### Mapping Rules

1. Preserve changelog order. Map pending entries from oldest to newest.
2. Prefer commit history in chronological order from oldest to newest within the inspected range.
3. Use commit subject, scoped diff summary, and surrounding context to judge whether a commit matches a pending message.
4. Evaluate candidate commits against the queued entry as written, even when the commit is administrative or repository-facing.
5. If exactly one commit clearly matches a pending entry, fill in that commit id.
6. If multiple commits are plausible for one entry, do not infer or synthesize an id. Present the ambiguity and ask the user to choose.
7. If one commit appears to correspond to multiple pending entries, do not merge them silently. Ask the user how to resolve the queue.
8. If a pending entry does not have any plausible commit match in the inspected range, leave its `commit` field empty and ask the user whether to widen the history range, edit the queue, or leave it unresolved.

## Process

### Inspect

1. Read `/changes/changelog.json`.
2. Validate the file contract.
3. Count resolved and pending entries.
4. Determine the Git history range to inspect using the anchoring rules.
5. Inspect candidate commits in that range.

### Propose

6. Present the proposed entry-to-commit matches before writing.
7. For each proposed match, show:
   - the changelog message
   - the selected commit id
   - the commit subject
8. If any entry is ambiguous or unmatched, stop and ask the user how to resolve it before writing.
9. If the proposed matches are clear, ask `Approve this? Y/N.` before updating `/changes/changelog.json`.

### Execute

10. Update only the `commit` fields for the approved pending entries.
11. Do not reorder entries.
12. Do not change resolved entries that already have commit ids unless the user explicitly asks to correct one.

### Report

13. Report how many entries were resolved.
14. Report whether any entries remain pending.
15. Report the file path that was updated.

## Output Expectations

When using this rule, report:

- how many pending entries were found
- which commit range was inspected
- which entries were matched
- whether any entries remain unresolved
- whether `/changes/changelog.json` was updated
