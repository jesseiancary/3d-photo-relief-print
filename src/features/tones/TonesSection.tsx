import { Section } from '@/components/Section'
import { Segmented } from '@/components/Segmented'
import { Slider } from '@/components/Slider'
import { MAX_TONES, MIN_TONES } from '@/core/defaults'
import type { ToneSettings } from '@/core/types'

interface Props {
  tones: ToneSettings
  defaults: ToneSettings
  filamentCount: number
  onChange: (patch: Partial<ToneSettings>) => void
}

export function TonesSection({ tones, defaults, filamentCount, onChange }: Props) {
  return (
    <Section title="Tones">
      <Segmented
        label="Tone mode"
        value={tones.mode}
        options={[
          { value: 'photo', label: 'Photo · blended' },
          { value: 'graphic', label: 'Graphic · 1 per filament' },
        ]}
        onChange={(mode) => onChange({ mode })}
      />
      {tones.mode === 'photo' ? (
        <Slider
          id="tones"
          label="Tones"
          min={MIN_TONES}
          max={MAX_TONES}
          step={1}
          value={tones.count}
          defaultValue={defaults.count}
          onChange={(v) => onChange({ count: v })}
        />
      ) : (
        <p className="hint">
          Each filament printed fully opaque: a crisp poster look with {filamentCount} tones.
        </p>
      )}
    </Section>
  )
}
