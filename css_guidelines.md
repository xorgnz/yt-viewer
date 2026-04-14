# CSS Guidelines

Use these rules when editing Svelte page-level styles.

## 1) Declaration Ordering (inside each CSS rule)

Write declarations in this order:

1. Size
   - `width`
   - `height`
   - related size constraints like `min-*`, `max-*`, `aspect-ratio`
2. Position
   - `display`
   - `position`
   - `top`
   - `left`
   - `transform`
   - `vertical-align`
   - `z-index`
   - related layout properties (`flex`, `grid`, `align-*`, `justify-*`, `overflow`)
3. Body
   - `border`
   - `margin`
   - `padding`
   - `box-sizing`
   - `background-color`
   - related box visuals (`border-radius`, `box-shadow`)
4. Content
   - `color`
   - font properties (`font-family`, `font-size`, `font-weight`)
   - `line-height`
   - `text-align`

## 2) Rule Ordering (inside `<style>`)

Order selectors to match DOM usage from top to bottom as closely as possible.

- Global wrapper/context selectors first (e.g. `:global(.app-content)`).
- Then page root/container selectors.
- Then child sections in markup order.
- Then shared/repeated utility selectors (e.g. `.badge` variants).
- Media-query overrides last, in the same selector order as base rules.

## 3) Selector Type Policy

Use **IDs for unique elements**.

- If an element appears once in the page, style it with `#id` instead of a class.
- Keep classes for reusable or repeated patterns (e.g. badge variants).
- If an element already has a stable `id`, prefer extending that selector over adding a new class.

## 4) Practical Notes

- Keep selectors flat and explicit; avoid deep chained selectors when possible.
- Preserve existing design tokens (`var(--...)`) instead of hardcoding new colors/sizes unless requested.
- Run `npm run check` after CSS edits.
