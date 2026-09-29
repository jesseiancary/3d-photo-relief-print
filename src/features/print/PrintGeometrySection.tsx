import { NumberField } from '@/components/NumberField'
import { Section } from '@/components/Section'
import { Slider } from '@/components/Slider'
import type { PrintSettings } from '@/core/types'

interface Props {
  print: PrintSettings
  defaults: PrintSettings
  nBase: number
  actualBase: number
  heightMm: number
  widthMm: number
  onChange: (patch: Partial<PrintSettings>) => void
}

export function PrintGeometrySection({
  print: p,
  defaults,
  nBase,
  actualBase,
  heightMm,
  widthMm,
  onChange,
}: Props) {
  return (
    <Section title="Print Geometry">
      <div className="grid2">
        <NumberField
          id="height-in"
          label="Height"
          unit="in"
          value={p.heightIn}
          min={1}
          max={12}
          step={0.25}
          note={
            <span className="num">
              {heightMm.toFixed(1)} × {widthMm ? widthMm.toFixed(1) : '–'} mm wide
            </span>
          }
          onChange={(v) => v && v > 0 && onChange({ heightIn: Math.min(12, v) })}
        />
        <NumberField
          id="base-mm"
          label="Base (first filament)"
          unit="mm"
          value={p.baseMm}
          min={p.firstLayerMm}
          max={3}
          step={p.layerMm}
          note={
            <span className="num">
              {nBase} layers → {actualBase.toFixed(2)} mm
            </span>
          }
          onChange={(v) => v && onChange({ baseMm: Math.max(p.firstLayerMm, v) })}
        />
      </div>
      <Slider
        id="corner-radius"
        label="Corner Radius"
        min={0}
        max={10}
        step={1}
        digits={0}
        value={p.cornerRadius}
        defaultValue={defaults.cornerRadius}
        onChange={(v) => onChange({ cornerRadius: v })}
      />
      <details className="more">
        <summary>Layer Settings</summary>
        <div className="grid2">
          <NumberField
            id="layer-mm"
            label="Layer Height"
            unit="mm"
            value={p.layerMm}
            defaultValue={defaults.layerMm}
            min={0.04}
            max={0.3}
            step={0.02}
            onChange={(v) => v && v >= 0.04 && onChange({ layerMm: Math.min(0.3, v) })}
          />
          <NumberField
            id="first-layer-mm"
            label="First Layer"
            unit="mm"
            value={p.firstLayerMm}
            defaultValue={defaults.firstLayerMm}
            min={0.08}
            max={0.4}
            step={0.02}
            onChange={(v) => v && v >= 0.08 && onChange({ firstLayerMm: Math.min(0.4, v) })}
          />
        </div>
        <div className="field">
          <label htmlFor="pitch">Model Detail</label>
          <select
            id="pitch"
            value={p.pitchMm}
            onChange={(e) => onChange({ pitchMm: Number(e.target.value) })}
          >
            <option value={0.1}>Fine · 0.10 mm grid</option>
            <option value={0.15}>Medium · 0.15 mm grid</option>
            <option value={0.2}>Coarse · 0.20 mm grid (smaller file)</option>
          </select>
        </div>
        <p className="hint">
          The 3MF carries these layer heights and the swaps, so the slicer loads them for you.
        </p>
      </details>
    </Section>
  )
}
