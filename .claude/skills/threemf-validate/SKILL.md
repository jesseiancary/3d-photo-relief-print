---
name: threemf-validate
description: >-
  Validate a produced .3mf file against the Bambu Studio loader rules that this
  project must satisfy — the Application tag, the [Content_Types].xml
  declaration, and the presence of project_settings.config. Use after changing
  the 3MF export path or when a slicer silently drops config/colors on import.
---

# Validate a 3MF export

A `.3mf` is a ZIP. Bambu Studio silently drops config (including color swaps)
when a few specific things are wrong — see
[docs/bambu-3mf-export.md](../../../docs/bambu-3mf-export.md) for the full rules.
This skill is the repeatable check for those failure modes.

## 1. Produce a file to inspect

Either use one the user points at, or generate a fresh one headlessly (see the
`/pipeline` command):

```bash
OUT="${TMPDIR:-/tmp}/relief-3mf"; mkdir -p "$OUT"
node -e 'const W=340,H=254,d=Buffer.alloc(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++)d[y*W+x]=Math.round(255*((x/W)*0.6+(y/H)*0.4));require("fs").writeFileSync(process.argv[1],d)' "$OUT/in.gray"
npx tsx scripts/cli.ts "$OUT/in.gray" 340 254 "$OUT/model.3mf" 1
```

## 2. List the archive contents

```bash
unzip -l "$OUT/model.3mf"
```

Expect (Bambu project mode): `3D/3dmodel.model`, `[Content_Types].xml`,
`Metadata/project_settings.config`, and the relationship files.

## 3. Run the checks

For each, PASS/FAIL. All must pass for Bambu Studio to keep config.

- **Application tag** — the model must advertise BambuStudio, or all config is dropped:

  ```bash
  unzip -p "$OUT/model.3mf" 3D/3dmodel.model | grep -o 'Application">[^<]*'
  ```

  → must read `BambuStudio-<version>` (e.g. `BambuStudio-01.09.00.00`). FAIL if it is anything else (generic, empty, another app).

- **Content type of the config** — the config is JSON and must NOT be declared as XML:

  ```bash
  unzip -p "$OUT/model.3mf" '\[Content_Types\].xml'
  ```

  → there must be **no** entry mapping the `project_settings.config` extension/part to `application/xml`. If it is declared `application/xml`, the loader XML-parses JSON and silently drops config → **FAIL**.

- **Config is present and is JSON**:

  ```bash
  unzip -p "$OUT/model.3mf" Metadata/project_settings.config | head -c 200
  ```

  → must be valid JSON (starts with `{`). Confirm the first N filament slots are recolored to the chosen filaments and layer heights match the print settings. Pipe to `node -e 'JSON.parse(require("fs").readFileSync(0))'` to assert it parses.

- **Geometry is manifold** — bad-edge count from the CLI run in step 1 must be `0`.

- **Plain-geometry mode** (if that path changed) — a plain export must be valid
  core-spec 3MF and ship an accompanying `swap-instructions.txt`.

## 4. Report

State each check as PASS/FAIL with the offending line quoted on failure, and map
any FAIL back to its symptom in the slicer (e.g. "Application tag generic →
Bambu Studio imports geometry but no colors/config"). If all pass, say the file
should import with config intact.
