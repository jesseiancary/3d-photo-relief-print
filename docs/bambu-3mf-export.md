# Bambu Studio / OrcaSlicer 3MF export

Notes on why the 3MF exporter (`src/core/threemf.ts`, `src/core/template.ts`) is built the way it
is. Most of this was learned the hard way against Bambu Studio 02.08; the rules are enforced by the
slicer's loader, not by the 3MF spec, so they aren't obvious from the file format alone.

## The core problem: config is silently dropped

A 3MF can carry a whole slicer project under `Metadata/` — `project_settings.config` (printer/print/
filament settings), `slice_info.config`, and `custom_gcode_per_layer.xml` (the **filament swaps** that
make a layered relief print in colour). Bambu Studio will **ignore all of it** unless one condition is
met:

> The model's `<metadata name="Application">` tag in `3D/3dmodel.model` must start with
> **`BambuStudio-<version>`** (e.g. `BambuStudio-02.08.02.61`).

The loader (`_handle_end_metadata` in `bbs_3mf.cpp`) reads the version from after that prefix. Any other
value — including our old `Photo Relief` — leaves the version unset and sets `dont_load_config = true`,
which skips **everything** under `Metadata/`.

Symptom by version:

- **~02.08.02:** popup _"The 3mf file has invalid config, load geometry data only."_
- **02.08.03+:** loads quietly as geometry only (no popup), swaps just missing.

Consequence: the MVP's embedded swaps never reached the slicer at all. `swap-instructions.txt` was the
only thing that worked, because a human read it.

## Why we reuse a template instead of synthesising config

Bambu's `project_settings.config` must be the slicer's **complete, versioned schema** — hundreds of
keys, matched to the installed version. A lean/hand-written config (even one that's valid JSON and
names the right presets) is not enough; the loader still rejects it. We tried:

- A minimal preset-referencing config → rejected.
- A config cloned from a real project but with the filament arrays resized → risky: the current P2S
  schema (v02.08) stores per-filament arrays **doubled/tripled by nozzle variant** (lengths like 4, 8,
  12, 16 for 4 filaments), and the layouts differ per key, so resizing the filament count by hand
  produces length mismatches that get the config rejected.

So the app doesn't generate config. It reuses a **slicer template**: a real project the user saved once
from their slicer (`File → Save Project`). At export we change only what depends on the photo:

- recolour the first N filament slots to the stack (`filament_colour`),
- set `layer_height` / `initial_layer_print_height` to ours so the swap heights land on layer
  boundaries,
- copy the template's `Application` tag onto the model.

Everything else — machine G-code, bed shape, temperatures, the whole schema — comes straight from a
project the slicer itself wrote, so it's correct by construction. Slots beyond the stack are left as the
template had them (unused by the print). See `projectConfigFor()` in `src/core/template.ts`.

The built-in default template is `src/core/defaultTemplate.json` (a Bambu Lab P2S 0.4 nozzle, 0.08 mm,
100% infill, 1 wall project). Users import their own for a different printer via the Slicer template
panel; `parseTemplate()` extracts the config + Application tag from any saved project 3MF.

## Other gotchas

- **`[Content_Types].xml` must not declare `project_settings.config` as `application/xml`.** It's JSON.
  If declared as XML, the loader XML-parses JSON, fails, and drops all config — same "geometry only"
  outcome. Bambu's own files don't declare the `.config` parts in Content_Types at all; the loader reads
  them by name. We only declare `rels`, `model`, and `txt`.
- **Application version should be ≤ the installed slicer**, or the user gets a "newer version" dialog.
  Reusing the template's own tag handles this automatically.
- Printer identity is flexible on load — a P1S project opens fine on a P2S. The "invalid config" error
  was never about the printer; it was always the Application tag / config completeness.

## Two export modes

- **Bambu project** (`write3mf` with a `template`): the mesh as a referenced object plus the template's
  config (recoloured), `model_settings.config`, `slice_info.config`, and `custom_gcode_per_layer.xml`.
  Opens in Bambu Studio / OrcaSlicer ready to slice with the swaps loaded.
- **Plain geometry** (`write3mf` with `template: null`): a bare core-spec 3MF plus
  `swap-instructions.txt`, for any other slicer (PrusaSlicer, Cura, …).
