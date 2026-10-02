import type { TonePlan } from '@/core/tones'
import type { Filament } from '@/core/types'
import { cn } from '@/lib/cn'

const th = 'border-b border-line pb-1.5 pr-2 text-left text-label text-muted'
const td = 'border-b border-line py-1.75 pr-2 align-top'
const tdNum = cn('num', td, 'w-[1%] whitespace-nowrap pr-3.5')
const dot = 'mr-1.75 inline-block h-2.5 w-2.5 rounded-full align-[-1px] shadow-swatch'

export function SwapTable({ plan, filaments }: { plan: TonePlan; filaments: Filament[] }) {
  return (
    <table className="w-full border-collapse text-body [&_tr:last-child_td]:border-b-0">
      <thead>
        <tr>
          <th className={th}>Layer</th>
          <th className={th}>Z</th>
          <th className={th}>Filament</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={tdNum}>1</td>
          <td className={tdNum}>0.00</td>
          <td className={td}>
            <i className={dot} style={{ background: filaments[0]?.color }} />
            Start with {filaments[0]?.name}
          </td>
        </tr>
        {plan.swaps.map((s) => (
          <tr key={s.layer}>
            <td className={tdNum}>{s.layer}</td>
            <td className={tdNum}>{s.z.toFixed(2)}</td>
            <td className={td}>
              <i className={dot} style={{ background: filaments[s.filament]?.color }} />
              Swap to {filaments[s.filament]?.name}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
