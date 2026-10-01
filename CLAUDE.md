# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser-only tool (no backend) that turns a photo into a layered multi-filament relief (HueForge-style) and exports a 3MF for slicing. React + TypeScript + Vite. All heavy work runs in a Web Worker.

## Planned direction

Currently browser-only, but this is expected to grow into a full multi-user app. Keep this trajectory in mind when making architectural decisions:

- **Backend + accounts** — user login, and per-user server storage for images, the filament-profile library, and the slicer-template library (today these are localStorage/JSON only).
- **Next.js** — likely to be adopted when appropriate (SSR/RSC + auth). New code should stay SSR-friendly: keep `src/core/` pure and framework-free, avoid runtime CSS-in-JS.
- **shadcn/ui** — will definitely be adopted for the account/library/CRUD UI. It layers on the existing Tailwind setup (Radix primitives + our `@theme` tokens), so **keep Tailwind and its token system** — do not revert to CSS/SCSS or swap in a full component kit.
- **Self-contained artifact goes away** — the single-file build (`build:single` / `build:artifact`) will likely be abandoned once the backend lands, so it no longer needs to constrain dependency/bundle choices.

## Commands

```bash
npm install
npm run dev             # local dev server
npm test                # vitest run (tone model, median blur, mesh manifold checks, end-to-end 3MF)
npx vitest run src/core/mesh.test.ts   # a single test file
npm run lint            # oxlint
npm run format          # format everything with Prettier
npm run format:check    # verify formatting (no writes)
npm run build           # static multi-file build → dist/
npm run build:single    # one self-contained HTML (worker inlined) → dist-single/index.html
npm run build:artifact  # body-only page for publishing as a claude.ai artifact
npx tsx scripts/cli.ts in.gray W H out.3mf [heightIn]   # headless pipeline on a raw 8-bit grey file
```

## Architecture

The pipeline is: **photo → grey → median blur → levels (black/white point, gamma) → sharpen → snap each pixel to the nearest printable tone → terraced mesh → 3MF.** The `src/core/` modules are pure and framework-free; `src/worker/` runs them off the main thread; `src/components/` + `src/features/` + `src/hooks/` + `src/lib/` + `src/App.tsx` is the React layer. Imports use a `@/` → `src/` path alias (configured in [tsconfig.app.json](tsconfig.app.json) and [vite.config.ts](vite.config.ts)).

**Core (`src/core/`)** — the whole engine, all pure functions over typed arrays:

- [pipeline.ts](src/core/pipeline.ts) — orchestrates the stages: `process()` (grey → tone indices), `buildMesh()`, `stepWedge()`. The entry point that ties the others together.
- [tones.ts](src/core/tones.ts) — the tone model. First filament is an opaque base; each later filament is a band of layers blending toward its color (full coverage ≈ TD × 0.1 mm). It simulates color at every layer height, picks heights whose tones are most evenly spaced in CIE L*, and derives swap layers. Graphic mode = one opaque tone per filament.
- [mesh.ts](src/core/mesh.ts) — builds one watertight solid from the tone grid: flat terraces, vertical walls, no T-junctions, every edge shared by exactly two triangles. `fixPinches()` removes diagonal-only contacts first.
- [threemf.ts](src/core/threemf.ts) + [template.ts](src/core/template.ts) — 3MF export (see below).
- [image.ts](src/core/image.ts) — grey conversion, median blur, levels, sharpen, quantize.
- [types.ts](src/core/types.ts) — `Settings` (`print`, `adjust`, `tones`, `filaments`) is the central config object threaded everywhere.

**Worker (`src/worker/`)** — [protocol.ts](src/worker/protocol.ts) is the message contract (Request/Response). [handler.ts](src/worker/handler.ts) holds the actual logic and caches the source `ImageBitmap` at multiple resolutions. [client.ts](src/worker/client.ts) `Engine` talks to it: previews are **latest-wins** (one in flight, one queued) so slider drags don't back up, and it **falls back to running the handler on the main thread** if the worker can't start (some sandboxes block workers). The same `createHandler` runs in both places.

**UI (React)** — feature-sliced, one component per directory, each with a barrel `index.ts`:

- [src/App.tsx](src/App.tsx) — the composition root. Calls the hooks, threads their results into the sections; holds only pure-UI state (`view`, `dragging`, `canvasRef`) and render-only derivations. No effects.
- [src/hooks/](src/hooks/) — all stateful/side-effecting logic: `useSettings` (persisted `Settings`), `useTemplate` (slicer template import/persist), `useReliefEngine` (owns the `Engine`, image loading, reactive preview, export/wedge), `useStatus`, `useCanvasPreview`.
- [src/features/](src/features/) — one folder per app section (`photo`, `print`, `adjust`, `tones`, `filaments`, `template`, `preview`, `plan`, `export`); presentational, driven by props.
- [src/components/](src/components/) — shared primitives (`Section`, `Slider`, `NumberField`, `Segmented`).
- [src/lib/](src/lib/) — browser helpers: `platform.ts` (localStorage, file save/pick), `sample.ts` (procedural sample image), `slug.ts`.

## 3MF export — the subtle part

Two modes, both in [threemf.ts](src/core/threemf.ts):

- **Bambu project (default)**: the mesh plus a real project the user saved from their slicer (a _slicer template_, [defaultTemplate.json](src/core/defaultTemplate.json) or one imported in-app). The template's `project_settings.config` is reused **verbatim** except the first N filament slots are recolored and layer heights set to ours. **Bambu Studio drops all config — color swaps included — unless the model's `Application` tag reads `BambuStudio-<version>`**, so we can't synthesise config and must reuse a real project. Also: `[Content_Types].xml` must **not** declare the JSON `project_settings.config` as `application/xml`, or the loader XML-parses JSON and silently drops config.
- **Plain geometry**: bare core-spec 3MF for other slicers, plus `swap-instructions.txt`.

**`color` vs `colour` — the keys are British, our code is American.** This codebase spells it **`color`** everywhere — identifiers, comments, UI copy, our own `Filament.color`. But Bambu Studio's `project_settings.config` keys are inherited from its PrusaSlicer/Slic3r lineage and are spelled the **British `colour`**: `filament_colour`, `filament_colour_type`, `default_filament_colour`, `extruder_colour`, `filament_multi_colour`. These are **protocol identifiers, not prose** — they must match the slicer byte-for-byte or Bambu silently ignores the unknown key and applies no colors on import (and `summarize()` reads the wrong key → reports 0 slots). So: never let a blanket `colour`→`color` rename touch these keys in [defaultTemplate.json](src/core/defaultTemplate.json), [template.ts](src/core/template.ts), the 3MF test assertion in [pipeline.test.ts](src/core/pipeline.test.ts), or the docs that name the literal key. [defaultTemplate.json](src/core/defaultTemplate.json) is a real byte-for-byte Bambu export (Prettier-ignored) — restore it from git rather than hand-editing if a find-replace ever hits it.

Read [docs/bambu-3mf-export.md](docs/bambu-3mf-export.md) before touching 3MF output — it documents the slicer's config-loading rules that constrain what this code can do.

## Automated review

After completing a batch of changes to `src/core/mesh.ts`, `src/core/tones.ts`, `src/core/pipeline.ts`, or the 3MF export path ([threemf.ts](src/core/threemf.ts) / [template.ts](src/core/template.ts)), and **before reporting the work done**, proactively launch the `pipeline-reviewer` agent (`.claude/agents/pipeline-reviewer.md`) and fold its findings into the change. Trigger it once the change is coherent — at task completion, not after every edit — since these areas fail silently (non-manifold mesh, dropped Bambu config, uneven CIE L\* tones). No need to wait for an explicit request.

Likewise, after a batch of changes to the design system — [src/index.css](src/index.css), [src/lib/cn.ts](src/lib/cn.ts), the UI primitives in [src/components/](src/components/), or the feature components in [src/features/](src/features/) — and **before reporting the work done**, launch the `design-system-reviewer` agent (`.claude/agents/design-system-reviewer.md`) and fold its findings in. These areas fail silently too (an unregistered `cn()` token dropping a size/override, a `color-mix` token compiling opaque under `@theme inline`, unlayered CSS outranking utilities). It runs the `tailwind-tokens-validate` skill for the mechanical checks.

## Styling

Tailwind v4, CSS-first ([src/index.css](src/index.css) — no `tailwind.config.js`). The design system is **tokens → reusable components → utilities**, so systemic decisions change in one place:

- **Tokens are the single source of truth.** Colors, fonts, font sizes, radius, shadows, and the layout breakpoints are exposed to Tailwind in the `@theme inline` block of [src/index.css](src/index.css) (`--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*`). Color tokens map onto the raw themeable `:root` vars (`--color-primary: var(--accent-fill)`, etc.), which carry the light/dark values — so `bg-primary` / `text-foreground` switch with the theme automatically. Radius is `rounded-sm`/`-control`/`-card` and shadows are `shadow-card`/`-ring`/`-swatch`/`-stage`. Change a brand color, a size, or a radius here (or in the raw var) and it updates everywhere. `@custom-variant dark` targets `[data-theme='dark']`.
- **Type is a set of _roles_, not a size scale.** Each `--text-*` token bundles size **plus** weight/line-height/letter-spacing (via the v4 `--text-<name>--font-weight` / `--line-height` / `--letter-spacing` keys), so a role is used **alone** — compose only orthogonal bits (`uppercase`, color, `font-display`) on top, never a `font-*` weight to "fix" it. The roles: `text-title` (22/700, brand), `text-heading` (12/600/uppercase-tracking, section labels — used as `text-heading uppercase text-muted`), `text-body` (14/400, default/table/control text), `text-label` (14/400, field labels, table `th`, links), `text-caption` (12/400, hints/units/notes/figures). `text-label` is intentionally a **semantic alias** of `text-body` — identical size/weight, but used on labelled UI so the intent reads in the markup; don't "fix" it by adding a `font-*` weight. (`font-*` can still override a role's weight for genuine emphasis, e.g. a bold `<summary>` — but that's emphasis, not role-building.)
- **Consume tokens via utilities, don't scatter raw values.** Prefer a token utility (`bg-primary`, `rounded-control`, `shadow-card`, `text-caption`, `text-muted`) over a hardcoded color/size/radius/shadow — no arbitrary `text-[13px]` / `rounded-[5px]` / `shadow-[…]` / `bg-[color-mix(…)]`. Only make a value a token if it's a _systemic_ design decision — don't tokenise one-off layout numbers; those are just utilities (`flex items-center gap-4 p-6`). Derived brand/surface tints are tokens too: `bg-primary-wash` (faint accent), `bg-primary-soft` (translucent accent fill), `bg-surface-overlay` (semi-transparent surface).
- **`color-mix()` tokens must NOT go in `@theme inline`.** The `inline` color parser extracts only the base color and silently drops the mix (e.g. `bg-primary-wash` compiled to a fully-opaque `var(--accent-fill)`). Put any token whose value is a `color-mix(…)` (or other composed color) in the plain `@theme {…}` block in [src/index.css](src/index.css) instead — it emits as a real custom property the utility references (with an `@supports` fallback), and still themes via the nested `var()`. After adding one, grep the built CSS to confirm the `color-mix` survived.
- **Reusable primitives** ([src/components/](src/components/)) encapsulate a component's look in token utilities so features don't re-decide it: `Button` (variant map), `Card`, `Panel`, `Section`, `Slider`, `NumberField`, `Segmented`, `DropZone`, `ResettableLabel`, and `Hint` (the muted note paragraph — the one place the small-copy line-height lives). Variants are a `variant → classes` map merged with [cn()](src/lib/cn.ts) (clsx + tailwind-merge), which also lets callers override via `className`. No `cva`/`tailwind-variants` yet (revisit when shadcn/ui lands, per Planned direction).
- **`cn()` must know every custom token that shares a prefix with a default scale.** tailwind-merge only recognises the default scale values, so it mis-merges our custom ones: `text-caption`/`text-label`/… are read as text-_colors_ (a role + color collide → size dropped), and `rounded-control`/`rounded-card` are unrecognised (they never collide → a radius override silently fails). Shadows are the same trap: the default shadow scale is t-shirt sizes only, so `shadow-card`/`-ring`/`-swatch`/`-stage` never collide and a `className` shadow override keeps _both_ shadows. [cn.ts](src/lib/cn.ts) fixes all three with `extendTailwindMerge` (custom type roles in the `font-size` group, custom radii in `rounded`, custom shadows in the `shadow` theme scale). Font-family and color tokens merge correctly with no entry (the color scale is `isAny`). **When you add a new `--text-<role>`, `--radius-<name>`, or `--shadow-<name>`, add it to the matching list in cn.ts**, or it'll silently drop/fail inside any `cn()` (Button variants, Card, Hint, …).
- **Features** ([src/features/](src/features/)) compose primitives and use layout utilities in JSX directly; they hold no semantic CSS classes.
- **What stays in [src/index.css](src/index.css):** only the token layer plus base styling utilities can't express — `body`, `:focus-visible`, `input`/`select` defaults, `prefers-reduced-motion`, and the color-picker `::-webkit-*` pseudo-elements. No per-component semantic classes.
- **Hand-written CSS must be layered.** Put element/base rules in `@layer base {…}`, reusable classes (e.g. `.swatch-input`) in `@layer components {…}`, and custom utilities via `@utility` (e.g. `@utility num`). This is required, not cosmetic: unlayered CSS outranks Tailwind's `@layer utilities`, so an unlayered `input {…}` rule silently beats `pr-9.5`/`h-7`/`bg-*` on that element. Keeping base in `@layer base` lets utilities win (while still beating preflight).

## Notes

- Filament profiles live in localStorage (JSON import/export). No cropping or saved projects yet.
- PrusaSlicer color changes aren't written — use Plain 3MF + swap-instructions.txt.
- TypeScript is split into project references ([tsconfig.app.json](tsconfig.app.json), [tsconfig.node.json](tsconfig.node.json)); `npm run build` runs `tsc -b` first.
- Formatting is **Prettier** ([.prettierrc.json](.prettierrc.json): no semicolons, single quotes, 100 cols); linting is **oxlint**. They're complementary — oxlint doesn't enable formatting rules, so there's no bridge config. Run `npm run format` before committing. [defaultTemplate.json](src/core/defaultTemplate.json) is kept byte-for-byte and is Prettier-ignored ([.prettierignore](.prettierignore)).
