---
name: tailwind-tokens-validate
description: >-
  Validate the Tailwind v4 design system against the silent-failure rules this
  project must satisfy — every custom text/radius/shadow token registered in
  cn.ts, color-mix tokens surviving the build, and no scattered raw values. Use
  after changing src/index.css, src/lib/cn.ts, or the UI primitives.
---

# Validate the Tailwind design system

The design system is `tokens → primitives → utilities` (see the "Styling" section
of [CLAUDE.md](../../../CLAUDE.md)). A few mistakes fail **silently** — they lint,
typecheck, and build clean, but drop a style or compile a token to the wrong
value. This skill is the repeatable check for those failure modes.

All commands run from the repo root.

## 1. cn.ts token coverage

Every custom `--text-<role>` / `--radius-<name>` / `--shadow-<name>` defined in
index.css's `@theme` must be registered in the matching list in
[src/lib/cn.ts](../../../src/lib/cn.ts), or `cn()` mis-merges it.

```bash
# Tokens defined in the stylesheet:
grep -oE -- '--(text|radius|shadow)-[a-z]+' src/index.css | sort -u
# Names registered in cn.ts (font-size group, rounded group, shadow scale):
grep -nE -- "text: \[|rounded: \[|shadow: \[" src/lib/cn.ts
```

For each defined token, confirm its name appears in the right `cn.ts` list:

- `--text-<role>` → the `font-size` group's `text: [...]`.
- `--radius-<name>` → the `rounded: [...]` group (the default `sm` is already
  known and needs no entry; only custom names like `control`/`card` do).
- `--shadow-<name>` → the `theme.shadow` scale `[...]`.

→ **FAIL** if any custom token is missing from its list. Symptom: a `text-<role>`
is read as a colour and its size is dropped on collision; a `rounded-`/`shadow-`
override via `className` is silently ignored (both values kept). Colour and
font-family tokens need no entry — skip them.

## 2. color-mix tokens survive the build

`color-mix()` tokens must live in the plain `@theme {…}` block, never
`@theme inline` (the inline parser strips the mix). Confirm they emit as real
`color-mix` in the built CSS.

```bash
npm run build >/dev/null 2>&1 && grep -o 'color-mix([^;]*' dist/assets/*.css | head
```

→ **PASS** if `color-mix(` appears for the composed tokens
(`--color-primary-wash`, `--color-primary-soft`, `--color-surface-overlay`).
**FAIL** if a composed token compiled to a bare `var(--accent-fill)` with no mix —
it was wrongly placed in `@theme inline`. Symptom: a faint tint
(`bg-primary-wash`, etc.) renders fully opaque.

## 3. No color-mix under @theme inline

```bash
awk '/@theme inline[[:space:]]*\{/{f=1} f&&/color-mix/{print NR": "$0} f&&/^\}/{f=0}' src/index.css
```

→ **PASS** if this prints nothing. Any line is a `color-mix()` inside the `inline`
block → **FAIL** (move it to the plain `@theme {…}` block).

## 4. No scattered raw / arbitrary values

Features and primitives should consume token utilities, not arbitrary values.

```bash
grep -rnE 'text-\[|rounded-\[|shadow-\[|bg-\[color-mix' src/components src/features
```

→ **PASS** if empty. Each hit is a raw value that should be a token utility
(`text-caption`, `rounded-control`, `shadow-card`, `bg-primary-wash`) → **FAIL**.
(A deliberate one-off — e.g. `leading-[1.45]` in `Hint` — is a line-height, not a
token-shaped colour/size/radius/shadow, so it won't match these patterns.)

## 5. Report

State each check as PASS/FAIL with the offending line quoted on failure, and map
any FAIL back to its visible symptom (dropped size, ignored override, opaque
tint). If all pass, say the design system is consistent and the tokens compile
intact.
