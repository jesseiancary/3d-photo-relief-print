import type { Filament } from '@/core/types'
import { slug } from '@/lib/slug'

/** The export status line: "<saveMsg> · <k>k triangles · <mb> MB". */
export function exportSummary(saveMsg: string, triangles: number, byteLength: number): string {
  const mb = (byteLength / 1048576).toFixed(1)
  return `${saveMsg} · ${(triangles / 1000).toFixed(0)}k triangles · ${mb} MB`
}

/** Step-wedge filename built from the stack's filament names (last word of each, slugged). */
export function wedgeFilename(filaments: Filament[]): string {
  return `step-wedge-${filaments
    .map((f) => slug(f.name.split(' ').pop() ?? ''))
    .join('-')
    .toLowerCase()}.3mf`
}
