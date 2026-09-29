import { Section } from '@/components/Section'
import { Slider } from '@/components/Slider'
import type { AdjustSettings } from '@/core/types'

interface Props {
  adjust: AdjustSettings
  defaults: AdjustSettings
  canAutoLevel: boolean
  onChange: (patch: Partial<AdjustSettings>) => void
  onAutoLevels: () => void
}

export function AdjustSection({ adjust, defaults, canAutoLevel, onChange, onAutoLevels }: Props) {
  return (
    <Section
      title="Adjust"
      aside={
        <button type="button" className="link-btn" onClick={onAutoLevels} disabled={!canAutoLevel}>
          Auto Levels
        </button>
      }
    >
      <Slider
        id="blur"
        label="Smooth"
        unit=" mm"
        digits={2}
        min={0}
        max={1.5}
        step={0.05}
        value={adjust.blurMm}
        defaultValue={defaults.blurMm}
        hint="Median blur at print size. Removes speckle like wall texture; faces keep their edges."
        onChange={(v) => onChange({ blurMm: v })}
      />
      <Slider
        id="black"
        label="Black Point"
        min={0}
        max={200}
        step={1}
        value={adjust.blackPoint}
        defaultValue={defaults.blackPoint}
        onChange={(v) => onChange({ blackPoint: Math.min(v, adjust.whitePoint - 10) })}
      />
      <Slider
        id="white"
        label="White Point"
        min={55}
        max={255}
        step={1}
        value={adjust.whitePoint}
        defaultValue={defaults.whitePoint}
        onChange={(v) => onChange({ whitePoint: Math.max(v, adjust.blackPoint + 10) })}
      />
      <Slider
        id="gamma"
        label="Midtones"
        digits={2}
        min={0.4}
        max={2.5}
        step={0.05}
        value={adjust.gamma}
        defaultValue={defaults.gamma}
        hint="Above 1 brightens, below 1 darkens."
        onChange={(v) => onChange({ gamma: v })}
      />
      <Slider
        id="sharpen"
        label="Sharpen"
        digits={1}
        min={0}
        max={2}
        step={0.1}
        value={adjust.sharpen}
        defaultValue={defaults.sharpen}
        onChange={(v) => onChange({ sharpen: v })}
      />
    </Section>
  )
}
