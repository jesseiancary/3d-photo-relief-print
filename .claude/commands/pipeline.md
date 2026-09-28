---
description: Run the headless geometry pipeline on a synthetic image and report mesh health
---

# Pipeline (headless geometry check)

Exercise the core pipeline end to end via [scripts/cli.ts](../../scripts/cli.ts) — grey → tones → mesh → 3MF — and report the geometry health numbers. A ~5-second regression check after touching [src/core/mesh.ts](../../src/core/mesh.ts), [src/core/tones.ts](../../src/core/tones.ts), or [src/core/pipeline.ts](../../src/core/pipeline.ts).

## Why these dimensions

`gridFor()` sets `rows = round(heightMm / pitchMm)`, independent of the input image height, and the CLI refuses input whose dimensions don't already match the grid. With the default `pitchMm = 0.1` and `heightIn = 1` (→ 25.4 mm), `rows = 254`. So the synthetic image must be **254 rows**; columns are free (use 340 for a ~4:3 frame). If you change the passed height, recompute rows as `round(heightIn * 25.4 / 0.1)` and match the image height to it.

## Steps

1. Generate a synthetic 8-bit grey image (340×254) into the scratchpad. A diagonal gradient with a couple of bands gives real tone terracing to mesh:

   ```bash
   OUT="${TMPDIR:-/tmp}/relief-pipeline"
   mkdir -p "$OUT"
   node -e '
     const W=340,H=254,d=Buffer.alloc(W*H);
     for(let y=0;y<H;y++)for(let x=0;x<W;x++){
       let v=Math.round(255*((x/W)*0.6+(y/H)*0.4));
       if(((x/W*6|0)+(y/H*6|0))%2)v=Math.min(255,v+30);
       d[y*W+x]=v;
     }
     require("fs").writeFileSync(process.argv[1],d);
   ' "$OUT/in.gray"
   ```

2. Run the pipeline (heightIn = 1 to keep it fast):

   ```bash
   npx tsx scripts/cli.ts "$OUT/in.gray" 340 254 "$OUT/out.3mf" 1
   ```

## Report

The CLI prints stage timings plus the numbers that matter — surface them plainly:

- **pinches fixed** — diagonal-only contacts removed by `fixPinches` (some is normal; a spike after a change is worth a look)
- **verts / tris** — mesh size
- **bad edges** — from `checkManifold`; **must be 0** (every edge shared by exactly two triangles). Non-zero = not watertight → flag it loudly.
- **volume** — sanity check it is positive and plausible
- **swaps / tone z-heights / warnings** — from the tone plan

Call out any regression versus what the numbers should be (bad edges > 0, empty mesh, thrown error, or new warnings). Report timings only if a stage looks pathologically slow.
