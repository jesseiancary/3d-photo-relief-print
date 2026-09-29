import type { TonePlan } from '@/core/tones'
import type { Filament } from '@/core/types'

const css = (rgb: [number, number, number]) =>
  `rgb(${rgb.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255)).join(' ')})`

/** Each printed tone drawn as a column in cross-section: which filament sits where, how tall, how much of the image. */
export function StackDiagram({
  plan,
  filaments,
  counts,
}: {
  plan: TonePlan
  filaments: Filament[]
  counts: number[]
}) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  const order = plan.tones
    .map((t, i) => ({ t, share: counts[i] / total }))
    .sort((a, b) => a.t.z - b.t.z)
  const zMax = plan.maxZ
  return (
    <figure className="stack-figure">
      <div className="columns" style={{ ['--cols' as string]: order.length }}>
        {order.map(({ t, share }) => (
          <div className="col" key={t.z}>
            <div
              className="col-bar"
              style={{ height: `${(t.z / zMax) * 100}%` }}
              title={`${t.z.toFixed(2)} mm`}
            >
              {plan.bands.map((b) => {
                const top = Math.min(t.z, b.topZ)
                const h = top - b.bottomZ
                if (h <= 1e-6) return null
                return (
                  <span
                    key={b.filament}
                    style={{
                      height: `${(h / t.z) * 100}%`,
                      background: filaments[b.filament]?.color,
                    }}
                  />
                )
              })}
            </div>
            <span className="col-swatch" style={{ background: css(t.rgb) }} />
            <span className="col-z num">{t.z.toFixed(2)}</span>
            <span className="col-share num">
              {share < 0.0005 ? '–' : `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`}
            </span>
          </div>
        ))}
      </div>
      <figcaption>
        Each column is one printed tone in cross-section: its height in mm, the colour it should
        read as from the front, and how much of the image uses it.
      </figcaption>
    </figure>
  )
}
