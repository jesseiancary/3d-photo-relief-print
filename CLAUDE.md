# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser-only tool (no backend) that turns a photo into a layered multi-filament relief (HueForge-style) and exports a 3MF for slicing. React + TypeScript + Vite. All heavy work runs in a Web Worker.

## Commands

```bash
npm install
npm run dev             # local dev server
npm test                # vitest run (tone model, median blur, mesh manifold checks, end-to-end 3MF)
npx vitest run src/core/mesh.test.ts   # a single test file
npm run lint            # oxlint
npm run build           # static multi-file build → dist/
npm run build:single    # one self-contained HTML (worker inlined) → dist-single/index.html
npm run build:artifact  # body-only page for publishing as a claude.ai artifact
npx tsx scripts/cli.ts in.gray W H out.3mf [heightIn]   # headless pipeline on a raw 8-bit grey file
```

## Architecture

The pipeline is: **photo → grey → median blur → levels (black/white point, gamma) → sharpen → snap each pixel to the nearest printable tone → terraced mesh → 3MF.** The `src/core/` modules are pure and framework-free; `src/worker/` runs them off the main thread; `src/ui/` + `src/App.tsx` is the React layer.

**Core (`src/core/`)** — the whole engine, all pure functions over typed arrays:
- [pipeline.ts](src/core/pipeline.ts) — orchestrates the stages: `process()` (grey → tone indices), `buildMesh()`, `stepWedge()`. The entry point that ties the others together.
- [tones.ts](src/core/tones.ts) — the tone model. First filament is an opaque base; each later filament is a band of layers blending toward its colour (full coverage ≈ TD × 0.1 mm). It simulates colour at every layer height, picks heights whose tones are most evenly spaced in CIE L*, and derives swap layers. Graphic mode = one opaque tone per filament.
- [mesh.ts](src/core/mesh.ts) — builds one watertight solid from the tone grid: flat terraces, vertical walls, no T-junctions, every edge shared by exactly two triangles. `fixPinches()` removes diagonal-only contacts first.
- [threemf.ts](src/core/threemf.ts) + [template.ts](src/core/template.ts) — 3MF export (see below).
- [image.ts](src/core/image.ts) — grey conversion, median blur, levels, sharpen, quantize.
- [types.ts](src/core/types.ts) — `Settings` (`print`, `adjust`, `tones`, `filaments`) is the central config object threaded everywhere.

**Worker (`src/worker/`)** — [protocol.ts](src/worker/protocol.ts) is the message contract (Request/Response). [handler.ts](src/worker/handler.ts) holds the actual logic and caches the source `ImageBitmap` at multiple resolutions. [client.ts](src/worker/client.ts) `Engine` talks to it: previews are **latest-wins** (one in flight, one queued) so slider drags don't back up, and it **falls back to running the handler on the main thread** if the worker can't start (some sandboxes block workers). The same `createHandler` runs in both places.

## 3MF export — the subtle part

Two modes, both in [threemf.ts](src/core/threemf.ts):

- **Bambu project (default)**: the mesh plus a real project the user saved from their slicer (a *slicer template*, [defaultTemplate.json](src/core/defaultTemplate.json) or one imported in-app). The template's `project_settings.config` is reused **verbatim** except the first N filament slots are recoloured and layer heights set to ours. **Bambu Studio drops all config — colour swaps included — unless the model's `Application` tag reads `BambuStudio-<version>`**, so we can't synthesise config and must reuse a real project. Also: `[Content_Types].xml` must **not** declare the JSON `project_settings.config` as `application/xml`, or the loader XML-parses JSON and silently drops config.
- **Plain geometry**: bare core-spec 3MF for other slicers, plus `swap-instructions.txt`.

Read [docs/bambu-3mf-export.md](docs/bambu-3mf-export.md) before touching 3MF output — it documents the slicer's config-loading rules that constrain what this code can do.

## Notes

- Filament profiles live in localStorage (JSON import/export). No cropping or saved projects yet.
- PrusaSlicer colour changes aren't written — use Plain 3MF + swap-instructions.txt.
- TypeScript is split into project references ([tsconfig.app.json](tsconfig.app.json), [tsconfig.node.json](tsconfig.node.json)); `npm run build` runs `tsc -b` first.
