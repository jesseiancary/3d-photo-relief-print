import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { main, type CliIO } from './cli'

// At heightIn=1 the grid is 254×254 (25.4mm / 0.1mm pitch), so a 254×254 grey input
// passes the CLI's resample check. A diagonal gradient gives several distinct tones.
const SIDE = 254
function gradient(): Uint8Array {
  const data = new Uint8Array(SIDE * SIDE)
  for (let y = 0; y < SIDE; y++)
    for (let x = 0; x < SIDE; x++)
      data[y * SIDE + x] = Math.round((255 * (x + y)) / (2 * (SIDE - 1)))
  return data
}

describe('cli main (headless pipeline)', () => {
  it('turns a grey file into a watertight, manifold 3MF', () => {
    const writes = new Map<string, Uint8Array | Uint8ClampedArray>()
    const io: CliIO = {
      readFile: () => gradient(),
      writeFile: (p, d) => void writes.set(p, d),
      log: () => {},
    }
    const res = main(['in.gray', String(SIDE), String(SIDE), 'out.3mf', '1'], io)

    expect(res.manifold.bad).toBe(0)
    expect(res.manifold.volume).toBeGreaterThan(0)
    expect(res.triangles).toBeGreaterThan(0)

    // both the 3MF and the sim dump were written
    expect(writes.has('out.3mf')).toBe(true)
    expect(writes.has('out.3mf.rgba')).toBe(true)

    // the 3MF is a real Bambu project zip
    const files = unzipSync(res.bytes)
    expect(Object.keys(files)).toContain('3D/3dmodel.model')
    expect(Object.keys(files)).toContain('Metadata/project_settings.config')
    expect(strFromU8(files['[Content_Types].xml'])).not.toContain('project_settings.config')
  })

  it('rejects a mismatched input size with a resample hint', () => {
    const io: CliIO = { readFile: () => new Uint8Array(0), writeFile: () => {}, log: () => {} }
    expect(() => main(['in.gray', '100', '100', 'out.3mf', '1'], io)).toThrow(/resample/)
  })
})
