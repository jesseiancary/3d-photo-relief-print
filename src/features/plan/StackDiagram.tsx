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
    <figure className="m-0 grid gap-2">
      <div
        className="grid h-42.5 items-end gap-1.5 overflow-x-auto grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={{ ['--cols' as string]: order.length }}
      >
        {order.map(({ t, share }) => (
          <div
            className="grid h-full min-w-6.5 justify-items-center gap-0.75 grid-rows-[1fr_auto_auto_auto]"
            key={t.z}
          >
            <div
              className="flex w-full max-w-10 flex-col-reverse self-end overflow-hidden rounded-t-xs shadow-ring"
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
                    className="block w-full"
                    style={{
                      height: `${(h / t.z) * 100}%`,
                      background: filaments[b.filament]?.color,
                    }}
                  />
                )
              })}
            </div>
            <span
              className="h-4 w-full max-w-10 rounded-sm shadow-swatch"
              style={{ background: css(t.rgb) }}
            />
            <span className="num text-caption">{t.z.toFixed(2)}</span>
            <span className="num text-caption text-muted">
              {share < 0.0005 ? '–' : `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="text-caption text-muted">
        Each column is one printed tone in cross-section: its height in mm, the color it should read
        as from the front, and how much of the image uses it.
      </figcaption>
    </figure>
  )
}
