/**
 * Terrace mesher: turns a grid of height indices into one watertight, consistently oriented solid.
 *
 * Every grid cell is a column from z=0 up to zs[H[cell]]. The surface is built from
 *  - top faces: one strip per horizontal run of equal cells, zipped between the vertex chains of its two edges
 *  - vertical walls wherever neighbouring cells (or the outside) differ, split at every intermediate height
 *    present at their corners so no T-junctions are created
 *  - a bottom fan at z=0
 * Every edge is shared by exactly two triangles. Diagonal-only contacts ("pinches") would make non-manifold
 * edges, so fixPinches() removes them first by raising one cell.
 */

export interface Mesh {
  positions: Float32Array // xyz triples, mm
  triangles: Uint32Array // vertex index triples, CCW seen from outside
}

/** Raise cells until no 2×2 block has two diagonal cells both strictly above the other two. Mutates H. */
export function fixPinches(H: Uint8Array, cols: number, rows: number): number {
  let changed = 0
  for (let pass = 0; pass < 50; pass++) {
    let c = 0
    for (let y = 0; y < rows - 1; y++) {
      const o = y * cols, p = o + cols
      for (let x = 0; x < cols - 1; x++) {
        const a = H[o + x], b = H[o + x + 1], cc = H[p + x], d = H[p + x + 1]
        if (Math.min(a, d) > Math.max(b, cc)) {
          const t = Math.min(a, d)
          if (b >= cc) H[o + x + 1] = t; else H[p + x] = t
          c++
        } else if (Math.min(b, cc) > Math.max(a, d)) {
          const t = Math.min(b, cc)
          if (a >= d) H[o + x] = t; else H[p + x + 1] = t
          c++
        }
      }
    }
    changed += c
    if (!c) break
  }
  return changed
}

class Grow<T extends Float32Array | Uint32Array> {
  n = 0
  arr: T
  private make: (n: number) => T
  constructor(make: (n: number) => T, cap: number) { this.make = make; this.arr = make(cap) }
  push3(a: number, b: number, c: number) {
    if (this.n + 3 > this.arr.length) {
      const next = this.make(this.arr.length * 2); next.set(this.arr); this.arr = next
    }
    this.arr[this.n++] = a; this.arr[this.n++] = b; this.arr[this.n++] = c
  }
  done(): T { return this.arr.slice(0, this.n) as T }
}

/**
 * @param H height index per cell (row-major, row 0 = top of the image), values 1..zs.length-1
 * @param zs z in mm for each height index; zs[0] must be 0 (the bed)
 * @param pitch cell size in mm
 */
export function terraceMesh(H: Uint8Array, cols: number, rows: number, zs: number[], pitch: number): Mesh {
  if (zs.length > 16) throw new Error('at most 15 heights')
  const pos = new Grow((n) => new Float32Array(n), 1 << 20)
  const tri = new Grow((n) => new Uint32Array(n), 1 << 21)
  const vmap = new Map<number, number>()
  const W1 = cols + 1

  const vert = (x: number, y: number, h: number) => {
    const key = (y * W1 + x) * 16 + h
    let id = vmap.get(key)
    if (id === undefined) {
      id = pos.n / 3
      vmap.set(key, id)
      pos.push3(x * pitch, (rows - y) * pitch, zs[h])
    }
    return id
  }
  const cell = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : H[y * cols + x])

  // heights present at a grid corner, restricted to [lo, hi], ascending
  const scratch: number[] = []
  const cornerHeights = (x: number, y: number, lo: number, hi: number) => {
    scratch.length = 0
    const hs = [cell(x - 1, y - 1), cell(x, y - 1), cell(x - 1, y), cell(x, y)]
    for (const h of hs) if (h >= lo && h <= hi && !scratch.includes(h)) scratch.push(h)
    return scratch.sort((a, b) => a - b).slice()
  }

  /** wall between corners P and Q from height lo to hi; its outward normal is to the right of P→Q (seen from above) */
  const wall = (px: number, py: number, qx: number, qy: number, lo: number, hi: number) => {
    const P = cornerHeights(px, py, lo, hi), Q = cornerHeights(qx, qy, lo, hi)
    let i = 0, j = 0
    while (i < P.length - 1 || j < Q.length - 1) {
      const advQ = i === P.length - 1 || (j < Q.length - 1 && Q[j + 1] <= P[i + 1])
      if (advQ) { tri.push3(vert(px, py, P[i]), vert(qx, qy, Q[j]), vert(qx, qy, Q[j + 1])); j++ }
      else { tri.push3(vert(px, py, P[i]), vert(qx, qy, Q[j]), vert(px, py, P[i + 1])); i++ }
    }
  }

  // run endpoints per row: x positions where the height changes, plus 0 and cols
  const E: Int32Array[] = []
  for (let y = 0; y < rows; y++) {
    const xs = [0], o = y * cols
    for (let x = 1; x < cols; x++) if (H[o + x] !== H[o + x - 1]) xs.push(x)
    xs.push(cols)
    E.push(Int32Array.from(xs))
  }
  const merge = (a: Int32Array, b: Int32Array) => {
    const out: number[] = []
    let i = 0, j = 0
    while (i < a.length || j < b.length) {
      const v = j >= b.length || (i < a.length && a[i] <= b[j]) ? a[i++] : b[j++]
      if (out[out.length - 1] !== v) out.push(v)
    }
    return Int32Array.from(out)
  }
  // S[y] = vertex x positions along grid line y
  const S: Int32Array[] = []
  for (let y = 0; y <= rows; y++) S.push(y === 0 ? E[0] : y === rows ? E[rows - 1] : merge(E[y - 1], E[y]))

  const slice = (s: Int32Array, x0: number, x1: number) => {
    let a = 0; while (s[a] < x0) a++
    let b = a; while (s[b] < x1) b++
    return s.subarray(a, b + 1)
  }

  // top faces
  for (let y = 0; y < rows; y++) {
    const e = E[y]
    for (let k = 0; k < e.length - 1; k++) {
      const x0 = e[k], x1 = e[k + 1], h = H[y * cols + x0]
      const A = slice(S[y], x0, x1) // upper edge (grid y)
      const B = slice(S[y + 1], x0, x1) // lower edge (grid y+1)
      let i = 0, j = 0
      while (i < B.length - 1 || j < A.length - 1) {
        const advB = j === A.length - 1 || (i < B.length - 1 && B[i + 1] <= A[j + 1])
        if (advB) { tri.push3(vert(B[i], y + 1, h), vert(B[i + 1], y + 1, h), vert(A[j], y, h)); i++ }
        else { tri.push3(vert(B[i], y + 1, h), vert(A[j + 1], y, h), vert(A[j], y, h)); j++ }
      }
    }
  }

  // horizontal walls (between row y-1 above and row y below), including the top and bottom borders
  for (let y = 0; y <= rows; y++) {
    const s = S[y]
    for (let k = 0; k < s.length - 1; k++) {
      const x0 = s[k], x1 = s[k + 1]
      const up = cell(x0, y - 1), dn = cell(x0, y)
      if (up > dn) wall(x0, y, x1, y, dn, up)
      else if (dn > up) wall(x1, y, x0, y, up, dn)
    }
  }

  // vertical walls (between column x-1 and x), including the left and right borders
  for (let y = 0; y < rows; y++) {
    const e = E[y]
    for (let k = 0; k < e.length; k++) {
      const x = e[k]
      const l = cell(x - 1, y), r = cell(x, y)
      if (l > r) wall(x, y + 1, x, y, r, l)
      else if (r > l) wall(x, y, x, y + 1, l, r)
    }
    // borders: E always contains 0 and cols, handled above because cell() is 0 outside
  }

  // bottom: fan from the centre over every perimeter vertex at z=0, CCW-from-above perimeter, faces down
  const ring: number[] = []
  for (const x of S[rows]) ring.push(vert(x, rows, 0))
  for (let y = rows - 1; y >= 0; y--) ring.push(vert(cols, y, 0))
  for (let k = S[0].length - 2; k >= 0; k--) ring.push(vert(S[0][k], 0, 0))
  for (let y = 1; y < rows; y++) ring.push(vert(0, y, 0))
  const c = pos.n / 3
  pos.push3((cols * pitch) / 2, (rows * pitch) / 2, 0)
  for (let k = 0; k < ring.length; k++) tri.push3(c, ring[(k + 1) % ring.length], ring[k])

  return { positions: pos.done(), triangles: tri.done() }
}

/** Check that every directed edge appears once and its reverse once (closed, oriented 2-manifold). */
export function checkManifold(m: Mesh): { ok: boolean; bad: number; volume: number } {
  const t = m.triangles, p = m.positions
  const edges = new Map<string, number>()
  let vol = 0
  for (let i = 0; i < t.length; i += 3) {
    const v = [t[i], t[i + 1], t[i + 2]]
    for (let k = 0; k < 3; k++) {
      const key = `${v[k]},${v[(k + 1) % 3]}`
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
    const [a, b, c] = v.map((j) => [p[3 * j], p[3 * j + 1], p[3 * j + 2]])
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
  }
  let bad = 0
  for (const [k, n] of edges) {
    const [a, b] = k.split(',')
    if (n !== 1 || edges.get(`${b},${a}`) !== 1) bad++
  }
  return { ok: bad === 0, bad, volume: vol }
}
