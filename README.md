# Photo Relief

Turns a photo into a layered multi-filament relief (HueForge-style) and exports a 3MF. Everything runs in the browser; no backend.

## Pipeline

photo → grey → median blur (mm at print size) → levels (black point, white point, midtones) → sharpen → snap each pixel to the nearest **printable tone** → terraced mesh → 3MF

- **Tone model** (`src/core/tones.ts`): the first filament is an opaque base. Each later filament is a band of layers, and each layer blends toward that filament's colour, reaching full coverage at about TD × 0.1 mm. The app simulates the colour at every layer height, picks the heights whose tones are most evenly spaced in CIE L*, and derives the swap layers from them. Graphic mode prints one fully opaque tone per filament.
- **Mesh** (`src/core/mesh.ts`): one watertight solid built straight from the tone grid, with flat terraces and vertical walls. It has no T-junctions, and every edge is shared by exactly two triangles. Diagonal-only contacts are removed first.
- **3MF** (`src/core/threemf.ts`, `src/core/template.ts`): two modes.
  - **Bambu project** (default): the mesh as a referenced object plus a real project the user saved from their slicer (a _slicer template_, `src/core/defaultTemplate.json` or one imported in the app). The template's `project_settings.config` is reused verbatim except the first N filament slots are recoloured to the stack and `layer_height`/`initial_layer_print_height` are set to ours; the template's `Application` tag is copied onto the model. Bambu Studio **drops all config — swaps included — unless that tag reads `BambuStudio-<version>`** (`_handle_end_metadata` in `bbs_3mf.cpp`), which is why we can't synthesise the config and must reuse a real project. Also writes `model_settings.config`, `slice_info.config`, and `custom_gcode_per_layer.xml` (the swaps). `[Content_Types].xml` must **not** declare the JSON `project_settings.config` as `application/xml`, or the loader XML-parses JSON and drops config.
  - **Plain geometry**: a bare core-spec 3MF for other slicers, with `swap-instructions.txt`.

  See [docs/bambu-3mf-export.md](docs/bambu-3mf-export.md) for the full story on the slicer's config-loading rules.

- **Step wedge**: one row per filament band, one 8 mm patch per layer, so you can check TD values against a real print.

Processing runs in a Web Worker (`src/worker`) and falls back to the main thread if workers are blocked.

## Commands

```bash
npm install
npm run dev             # local dev server
npm test                # unit tests (tone model, median, mesh manifold checks, end-to-end 3MF)
npm run lint            # oxlint
npm run format          # format everything with Prettier
npm run format:check    # check formatting without writing (CI-friendly)
npm run build           # static multi-file build → dist/
npm run build:single    # one self-contained HTML → dist-single/index.html
npm run build:artifact  # body-only page for publishing as a claude.ai artifact
npx tsx scripts/cli.ts in.gray W H out.3mf [heightIn]   # headless pipeline on a raw 8-bit grey file
```

## Known limits / next steps

- The Bambu export reuses a slicer template (built-in default is a Bambu Lab P2S 0.4 nozzle, 0.08 mm, 100% infill, 1 wall project). Import your own via the Slicer template panel for a different printer. Extra template slots beyond the stack are left unused; if the stack has more filaments than the template, save a template with more filaments. The template's Application version should be ≤ your installed slicer, or it shows a "newer version" dialog.
- PrusaSlicer color changes are not written yet; use the Plain 3MF export with swap-instructions.txt.
- Inside a claude.ai artifact, the host's download prompt doesn't accept `.3mf`, so the file arrives wrapped in a `.zip`.
- No cropping and no saved projects yet. Filament profiles are kept in localStorage, with JSON import and export.
- HEIC photos need converting to JPEG first.
