# Testing

Tests are a first-class artifact here, and their failure modes are **silent** — a skipped,
mis-environment, or assertion-less test still reports green. Write them so they pin real
behaviour, and reuse the seams and fixtures that already exist.

Full orientation is in the "Testing" section of [CLAUDE.md](../../CLAUDE.md). This file is the
short rulebook.

## The three layers

- **Unit (Node, the default):** pure `src/core/` logic plus extracted helpers — the bulk of
  coverage. Tests sit next to their module as `*.test.ts`.
- **Hook/component (jsdom):** opt in per-file with `// @vitest-environment jsdom` on line 1
  (keeps the fast Node default everywhere else). Uses `@testing-library/react`;
  [src/test/setup.ts](../../src/test/setup.ts) wires jest-dom + cleanup. Every `*.test.tsx`
  needs the pragma; so does any `*.test.ts` that touches the DOM/`localStorage`/`window`.
- **End-to-end (Playwright):** specs in [e2e/](../../e2e/) run against `npm run dev` and are
  excluded from Vitest. Use them only for what jsdom can't — canvas painting, the real Web
  Worker round-trip, the file download → 3MF.

## Rules

- **Prefer the DI seam over polyfilling.** Logic in a worker/React/DOM-bound file is tested by
  driving its injected seam, not by shimming a browser global:
  - `new Engine({ workerFactory, decode })` — a fake worker / injected decode.
  - `createHandler(post, { toGray })` — an injected rasterizer (no OffscreenCanvas).
  - `main(argv, io)` in [scripts/cli.ts](../../scripts/cli.ts) — a `CliIO` fake (no `fs`).
  - `useReliefEngine({ …, engineFactory })` — a fake engine.
    When adding logic to such a file, **extract the pure part and unit-test that** (as was done
    for `computeAutoLevels`, `histogram`, `applyCornerAlpha`, `mergeSettings`, `profiles.ts`, and
    the `saveFile` decision helpers) rather than writing a browser-only test.

- **Reuse [src/test/helpers.ts](../../src/test/helpers.ts).** The seeded LCG, the median/volume
  oracles, and the preset-filament builder live there — never re-define a local LCG. Moving a
  test onto a shared fixture must not change any assertion.

- **Assert invariants, not snapshots.** The high-value assertions are behavioural: mesh
  manifold `checkManifold().bad === 0`, the histogram summing to the pixel count, tones
  monotonic in CIE L\*, and the three Bambu 3MF loader rules (`Application` tag,
  `[Content_Types].xml` not declaring `project_settings.config`, config present). Don't weaken
  or delete these when the code under them changes.

- **No stray `.only`** (it skips the rest of the file) and no `.skip` without a comment saying
  why it is parked.

- **Coverage is report-only.** `npm run coverage` (v8) produces a report; there is **no gate**.
  Don't chase the number with tests that assert nothing.

## Automated pass

After a batch of test changes, run the `vitest-health` skill for the mechanical checks and
launch the `test-reviewer` agent for the judgement calls (false-green assertions, over-casting,
seam vs. polyfill) before reporting the work done — see the "Automated review" section of
[CLAUDE.md](../../CLAUDE.md).
