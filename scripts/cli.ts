// Node CLI for testing the pipeline without a browser:
//   python3 -c "..." makes a raw grey file; then: npx tsx scripts/cli.ts in.gray W H out.3mf [heightIn]
import { readFileSync, writeFileSync } from 'node:fs'
import { argv } from 'node:process'
import { fileURLToPath } from 'node:url'

import { defaultSettings } from '../src/core/defaults'
import { gridFor, type Gray } from '../src/core/image'
import { checkManifold } from '../src/core/mesh'
import { buildMesh, process as run, simulatedRGBA } from '../src/core/pipeline'
import { DEFAULT_TEMPLATE } from '../src/core/template'
import { write3mf } from '../src/core/threemf'

/** I/O seam so the pipeline run can be driven from a test without touching disk/console. */
export interface CliIO {
  readFile: (path: string) => Uint8Array
  writeFile: (path: string, data: Uint8Array | Uint8ClampedArray) => void
  log: (...args: unknown[]) => void
}
const nodeIO: CliIO = {
  readFile: (p) => new Uint8Array(readFileSync(p)),
  writeFile: (p, d) => writeFileSync(p, d),
  log: console.log,
}

export interface CliResult {
  bytes: Uint8Array
  pinches: number
  manifold: ReturnType<typeof checkManifold>
  triangles: number
  sizeMm: [number, number]
}

/** Run the headless pipeline: grey file → tones → mesh → 3MF. Returns the result for assertions. */
export function main(args: string[], io: CliIO = nodeIO): CliResult {
  const [inp, W, Hh, out, hIn] = args
  const s = defaultSettings()
  if (hIn) s.print.heightIn = Number(hIn)
  const w = Number(W),
    h = Number(Hh)
  const g = gridFor(w, h, s.print.heightIn * 25.4, s.print.pitchMm)
  if (g.cols !== w || g.rows !== h) throw new Error(`resample to ${g.cols}x${g.rows} first`)
  const src: Gray = { w, h, data: io.readFile(inp) }
  let t = performance.now()
  const lap = (l: string) => {
    const n = performance.now()
    io.log(l, Math.round(n - t), 'ms')
    t = n
  }
  const p = run(src, s, g.mmPerPx)
  lap('process')
  const { mesh, pinches } = buildMesh(p.tones, g.cols, g.rows, p.plan, g.mmPerPx)
  lap('mesh')
  io.log(
    'pinches fixed',
    pinches,
    'verts',
    mesh.positions.length / 3,
    'tris',
    mesh.triangles.length / 3,
  )
  const c = checkManifold(mesh)
  lap('check')
  io.log('bad edges', c.bad, 'volume', c.volume.toFixed(1))
  const z = write3mf({
    mesh,
    title: 'CLI test',
    plan: p.plan,
    filaments: s.filaments,
    print: s.print,
    template: DEFAULT_TEMPLATE,
    sizeMm: [g.widthMm, g.heightMm],
  })
  lap('3mf')
  io.writeFile(out, z)
  io.log('bytes', z.length, 'size mm', g.widthMm.toFixed(1), g.heightMm)
  io.writeFile(out + '.rgba', simulatedRGBA(p.tones, p.plan))
  io.log(
    p.plan.swaps,
    p.plan.tones.map((x) => x.z),
    p.plan.warnings,
  )
  return {
    bytes: z,
    pinches,
    manifold: c,
    triangles: mesh.triangles.length / 3,
    sizeMm: [g.widthMm, g.heightMm],
  }
}

// Only run when invoked directly (`tsx scripts/cli.ts …`), not when imported by a test.
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) main(argv.slice(2))
