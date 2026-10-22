import { Hint } from '@/components/Hint'
import { NumberField } from '@/components/NumberField'
import { Section } from '@/components/Section'
import { Slider } from '@/components/Slider'
import type { PrintSettings } from '@/core/types'
import type { PrinterProfileDTO, UnitsPref } from '@/lib/library-types'
import { formatSize, MM_PER_IN, sizeDigits, toMm, unitLabel } from '@/lib/units'

interface Props {
  print: PrintSettings
  defaults: PrintSettings
  nBase: number
  actualBase: number
  heightMm: number
  widthMm: number
  units: UnitsPref
  /** The user's saved printers (empty when signed out) + the active selection, for the picker. */
  printers: PrinterProfileDTO[]
  printerId: string | null
  onSelectPrinter: (id: string | null) => void
  onChange: (patch: Partial<PrintSettings>) => void
}

export function PrintGeometrySection({
  print: p,
  defaults,
  nBase,
  actualBase,
  heightMm,
  widthMm,
  units,
  printers,
  printerId,
  onSelectPrinter,
  onChange,
}: Props) {
  // Height is stored in inches; only this one model-size field switches units (layer/base stay mm).
  const inMm = units === 'mm'
  // Round the displayed value with the same precision as the readout (sizeDigits) so they agree.
  const factor = 10 ** sizeDigits(units)
  return (
    <Section title="Print Geometry">
      {printers.length > 0 && (
        <div className="grid gap-1">
          <label htmlFor="printer-select" className="text-label">
            Printer
          </label>
          <select
            id="printer-select"
            value={printerId ?? ''}
            onChange={(e) => onSelectPrinter(e.target.value || null)}
            className="w-full"
          >
            <option value="">Manual (no profile)</option>
            {printers.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <NumberField
          id="height"
          label="Height"
          unit={unitLabel(units)}
          value={inMm ? Math.round(heightMm * factor) / factor : p.heightIn}
          min={inMm ? 25 : 1}
          max={inMm ? 305 : 12}
          step={inMm ? 1 : 0.25}
          note={
            <span className="num">
              {widthMm ? formatSize(widthMm, units) : '–'} × {formatSize(heightMm, units)}
            </span>
          }
          onChange={(v) =>
            v && v > 0 && onChange({ heightIn: Math.min(12, toMm(v, units) / MM_PER_IN) })
          }
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
      <details>
        <summary className="cursor-pointer text-body font-medium text-foreground">
          Layer Settings
        </summary>
        <div className="mt-2.5 grid gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
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
          <div className="grid min-w-0 gap-1">
            <label htmlFor="pitch" className="text-label">
              Model Detail
            </label>
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
          <Hint>
            The 3MF carries these layer heights and the swaps, so the slicer loads them for you.
          </Hint>
        </div>
      </details>
    </Section>
  )
}
