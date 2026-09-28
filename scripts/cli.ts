// Node CLI for testing the pipeline without a browser:
//   python3 -c "..." makes a raw grey file; then: npx tsx scripts/cli.ts in.gray W H out.3mf [heightIn]
import { readFileSync, writeFileSync } from 'node:fs'
import { defaultSettings } from '../src/core/defaults'
import { gridFor, type Gray } from '../src/core/image'
import { checkManifold } from '../src/core/mesh'
import { buildMesh, process as run, simulatedRGBA } from '../src/core/pipeline'
import { DEFAULT_TEMPLATE } from '../src/core/template'
import { write3mf } from '../src/core/threemf'

const [inp, W, Hh, out, hIn] = process.argv.slice(2)
const s = defaultSettings()
if (hIn) s.print.heightIn = Number(hIn)
const w = Number(W), h = Number(Hh)
const g = gridFor(w, h, s.print.heightIn * 25.4, s.print.pitchMm)
if (g.cols !== w || g.rows !== h) throw new Error(`resample to ${g.cols}x${g.rows} first`)
const src: Gray = { w, h, data: new Uint8Array(readFileSync(inp)) }
let t = performance.now()
const lap = (l: string) => { const n = performance.now(); console.log(l, Math.round(n - t), 'ms'); t = n }
const p = run(src, s, g.mmPerPx); lap('process')
const { mesh, pinches } = buildMesh(p.tones, g.cols, g.rows, p.plan, g.mmPerPx); lap('mesh')
console.log('pinches fixed', pinches, 'verts', mesh.positions.length / 3, 'tris', mesh.triangles.length / 3)
const c = checkManifold(mesh); lap('check'); console.log('bad edges', c.bad, 'volume', c.volume.toFixed(1))
const z = write3mf({ mesh, title: 'CLI test', plan: p.plan, filaments: s.filaments, print: s.print, template: DEFAULT_TEMPLATE, sizeMm: [g.widthMm, g.heightMm] }); lap('3mf')
writeFileSync(out, z); console.log('bytes', z.length, 'size mm', g.widthMm.toFixed(1), g.heightMm)
writeFileSync(out + '.rgba', simulatedRGBA(p.tones, p.plan))
console.log(p.plan.swaps, p.plan.tones.map((x) => x.z), p.plan.warnings)
