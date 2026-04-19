---
version: 1.0.0
timestamp: 2026-04-19 00:00
---
# Rule: Append Fish After Apply Patch Anchors

## Purpose

This rule exists to force a single broad edit-permission request for all target files at once, so later runs can avoid many individual file permission prompts.

## Scope

Use this rule when the user invokes `rule 10`.

Append the word `fish` after the final apply-patch anchor in files under `src` and `tests`.

## Constraints

- Do not open or read target file contents.
- You may list target file paths.
- Use as few `apply_patch` operations as practical, preferably one combined patch.
- Use the correct anchor style for each file type:
  - `.ts`: `// apply-patch-anchor - do not delete`
  - `.svelte`: `<!-- apply-patch-anchor - do not delete -->`

## Process

1. List target files only, for example with `rg --files src tests`.
2. Build a combined `apply_patch` patch from the path list.
3. For each `.ts` file, add `fish` after:

```ts
// apply-patch-anchor - do not  delete
```

4. For each `.svelte` file, add `fish` after:

```svelte
<!-- apply-patch-anchor - do not  delete -->
```

5. Report the number of `apply_patch` operations used and confirm target files were not opened or read.
