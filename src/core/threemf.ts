/**
 * 3MF writer with two modes:
 *  - Bambu project (a template is given): the mesh as a referenced object plus the slicer's own
 *    project_settings.config (recolored to the stack), model_settings.config, slice_info.config and
 *    custom_gcode_per_layer.xml (the swaps). The model's Application tag is copied from the template —
 *    Bambu Studio drops ALL config, swaps included, unless that tag reads "BambuStudio-<version>".
 *  - Plain geometry (no template): a bare core-spec 3MF for other slicers, with swap-instructions.txt.
 */
import { strToU8, Zip, ZipDeflate } from 'fflate'

import type { Mesh } from './mesh'
import { projectConfigFor, type SlicerTemplate } from './template'
import type { TonePlan } from './tones'
import type { Filament, PrintSettings } from './types'

/** plate is square; drop the model in the middle of a 256 mm bed (the slicer lets you move it after) */
const BED_CENTER = 128

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const num = (v: number) => {
  const s = v.toFixed(4)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

export function swapInstructions(
  title: string,
  plan: TonePlan,
  filaments: Filament[],
  p: PrintSettings,
  sizeMm: [number, number],
): string {
  const lines = [
    `${title}`,
    `Size: ${sizeMm[0].toFixed(1)} x ${sizeMm[1].toFixed(1)} mm, max height ${plan.maxZ.toFixed(2)} mm`,
    '',
    'Slicer settings',
    `  Layer height:        ${p.layerMm} mm`,
    `  First layer height:  ${p.firstLayerMm} mm`,
    '  Infill:              100%',
    '  Walls:               1',
    '  Ironing:             off',
    '',
    'Filaments (bottom to top)',
    ...filaments.map((f, i) => `  ${i + 1}. ${f.name}  ${f.color}  TD ${f.td}`),
    '',
    'Swaps',
    `  Start with ${filaments[0].name}`,
    ...plan.swaps.map(
      (s) => `  At layer ${s.layer} (${s.z.toFixed(2)} mm) swap to ${filaments[s.filament].name}`,
    ),
    '',
    'Printed tones (height -> expected look)',
    ...plan.tones.map((t) => `  ${t.z.toFixed(2)} mm  L*=${t.L.toFixed(0)}`),
    '',
  ]
  return lines.join('\n')
}

function bambuSwaps(plan: TonePlan, filaments: Filament[]): string {
  const rows = plan.swaps.map(
    (s) =>
      `<layer top_z="${s.z.toFixed(4)}" type="2" extruder="${s.filament + 1}" color="${esc(filaments[s.filament].color.toUpperCase())}" extra="" gcode="tool_change"/>`,
  )
  return `<?xml version="1.0" encoding="utf-8"?>\n<custom_gcodes_per_layer>\n<plate>\n<plate_info id="1"/>\n${rows.join('\n')}\n<mode value="MultiAsSingle"/>\n</plate>\n</custom_gcodes_per_layer>\n`
}

const MODEL_NS =
  'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" ' +
  'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" ' +
  'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"'

// --- shared mesh chunking (millions of triangles never become one giant string) ---
function* verticesAndTriangles(mesh: Mesh, openTag: string, closeTag: string): Generator<string> {
  yield openTag
  const p = mesh.positions,
    t = mesh.triangles
  const CH = 20000
  for (let i = 0; i < p.length; i += 3 * CH) {
    let s = ''
    for (let j = i; j < Math.min(p.length, i + 3 * CH); j += 3)
      s += `<vertex x="${num(p[j])}" y="${num(p[j + 1])}" z="${num(p[j + 2])}"/>\n`
    yield s
  }
  yield '    </vertices>\n    <triangles>\n'
  for (let i = 0; i < t.length; i += 3 * CH) {
    let s = ''
    for (let j = i; j < Math.min(t.length, i + 3 * CH); j += 3)
      s += `<triangle v1="${t[j]}" v2="${t[j + 1]}" v3="${t[j + 2]}"/>\n`
    yield s
  }
  yield closeTag
}

/** object_1.model: the Bambu-namespaced mesh object referenced by the project's wrapper */
const objectChunks = (mesh: Mesh) =>
  verticesAndTriangles(
    mesh,
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${MODEL_NS}>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n  <object id="1" p:UUID="00000000-0000-0000-0000-000000000001" type="model">\n   <mesh>\n    <vertices>\n`,
    '    </triangles>\n   </mesh>\n  </object>\n </resources>\n</model>\n',
  )

/** plain core-spec 3dmodel.model: inline mesh + build item, no slicer metadata */
const plainChunks = (mesh: Mesh, title: string) =>
  verticesAndTriangles(
    mesh,
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n <metadata name="Title">${esc(title)}</metadata>\n <metadata name="Application">Photo Relief</metadata>\n <resources>\n  <object id="1" name="${esc(title)}" type="model">\n   <mesh>\n    <vertices>\n`,
    '    </triangles>\n   </mesh>\n  </object>\n </resources>\n <build>\n  <item objectid="1"/>\n </build>\n</model>\n',
  )

function wrapperModel(title: string, application: string, transform: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" ${MODEL_NS}>
 <metadata name="Application">${esc(application)}</metadata>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <metadata name="Title">${esc(title)}</metadata>
 <resources>
  <object id="2" p:UUID="00000000-0000-0000-0000-000000000002" type="model">
   <components>
    <component p:path="/3D/Objects/object_1.model" objectid="1" p:UUID="00000000-0000-0000-0000-000000000003" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
   </components>
  </object>
 </resources>
 <build p:UUID="00000000-0000-0000-0000-000000000004">
  <item objectid="2" p:UUID="00000000-0000-0000-0000-000000000005" transform="${transform}" printable="1"/>
 </build>
</model>
`
}

function modelSettings(title: string, transform: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="2">
    <metadata key="name" value="${esc(title)}"/>
    <metadata key="extruder" value="1"/>
    <part id="1" subtype="normal_part">
      <metadata key="name" value="${esc(title)}"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="extruder" value="1"/>
    </part>
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
    <model_instance>
      <metadata key="object_id" value="2"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="100"/>
    </model_instance>
  </plate>
  <assemble>
   <assemble_item object_id="2" instance_id="0" transform="${transform}" offset="0 0 0" />
  </assemble>
</config>
`
}

function sliceInfo(filaments: Filament[]): string {
  const rows = filaments
    .map(
      (f, i) =>
        `    <filament id="${i + 1}" tray_info_idx="GFA00" type="PLA" color="${esc(f.color.toUpperCase())}" used_m="0" used_g="0" />`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <header>
    <header_item key="X-BBL-Client-Type" value="slicer"/>
    <header_item key="X-BBL-Client-Version" value=""/>
  </header>
  <plate>
    <metadata key="index" value="1"/>
    <metadata key="nozzle_diameters" value="0.4"/>
${rows}
  </plate>
</config>
`
}

// Bambu's own files don't declare the .config parts; declaring the JSON project_settings.config as
// application/xml makes the loader XML-parse JSON, which fails and drops all config.
const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
 <Default Extension="txt" ContentType="text/plain"/>
</Types>
`
const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`
const MODEL_RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`

export interface ThreeMfInput {
  mesh: Mesh
  title: string
  plan: TonePlan
  filaments: Filament[]
  print: PrintSettings
  sizeMm: [number, number]
  /** when set, write a slicer project reusing this template; otherwise write plain geometry */
  template?: SlicerTemplate | null
}

function collect(build: (zip: Zip) => void): Uint8Array {
  const parts: Uint8Array[] = []
  let err: Error | null = null
  const zip = new Zip((e, chunk) => {
    if (e) err = e
    else parts.push(chunk)
  })
  build(zip)
  zip.end()
  if (err) throw err
  const n = parts.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  for (const b of parts) {
    out.set(b, o)
    o += b.length
  }
  return out
}

export function write3mf(inp: ThreeMfInput, onProgress?: (f: number) => void): Uint8Array {
  const enc = new TextEncoder()
  const total = inp.mesh.positions.length / 3 + inp.mesh.triangles.length / 3

  return collect((zip) => {
    const addSmall = (name: string, text: string) => {
      const f = new ZipDeflate(name, { level: 6 })
      zip.add(f)
      f.push(strToU8(text), true)
    }
    const stream = (name: string, chunks: Generator<string>) => {
      const f = new ZipDeflate(name, { level: 6 })
      zip.add(f)
      let done = 0
      for (const s of chunks) {
        f.push(enc.encode(s))
        done += 20000
        onProgress?.(Math.min(1, done / total))
      }
      f.push(new Uint8Array(0), true)
    }

    addSmall('[Content_Types].xml', CONTENT_TYPES)
    addSmall('_rels/.rels', RELS)

    if (!inp.template) {
      stream('3D/3dmodel.model', plainChunks(inp.mesh, inp.title))
      addSmall(
        'swap-instructions.txt',
        swapInstructions(inp.title, inp.plan, inp.filaments, inp.print, inp.sizeMm),
      )
      return
    }

    const tx = BED_CENTER - inp.sizeMm[0] / 2,
      ty = BED_CENTER - inp.sizeMm[1] / 2
    const transform = `1 0 0 0 1 0 0 0 1 ${num(tx)} ${num(ty)} 0`
    addSmall('3D/3dmodel.model', wrapperModel(inp.title, inp.template.application, transform))
    addSmall('3D/_rels/3dmodel.model.rels', MODEL_RELS)
    stream('3D/Objects/object_1.model', objectChunks(inp.mesh))
    addSmall(
      'Metadata/project_settings.config',
      projectConfigFor(inp.template, inp.filaments, inp.print).text,
    )
    addSmall('Metadata/model_settings.config', modelSettings(inp.title, transform))
    addSmall('Metadata/slice_info.config', sliceInfo(inp.filaments))
    addSmall('Metadata/custom_gcode_per_layer.xml', bambuSwaps(inp.plan, inp.filaments))
    addSmall(
      'swap-instructions.txt',
      swapInstructions(inp.title, inp.plan, inp.filaments, inp.print, inp.sizeMm),
    )
  })
}
