import type { TonePlan } from '@/core/tones'
import type { Filament } from '@/core/types'

export function SwapTable({ plan, filaments }: { plan: TonePlan; filaments: Filament[] }) {
  return (
    <table className="swaps">
      <thead>
        <tr>
          <th>Layer</th>
          <th>Z</th>
          <th>Filament</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="num">1</td>
          <td className="num">0.00</td>
          <td>
            <i className="dot" style={{ background: filaments[0]?.color }} />
            Start with {filaments[0]?.name}
          </td>
        </tr>
        {plan.swaps.map((s) => (
          <tr key={s.layer}>
            <td className="num">{s.layer}</td>
            <td className="num">{s.z.toFixed(2)}</td>
            <td>
              <i className="dot" style={{ background: filaments[s.filament]?.color }} />
              Swap to {filaments[s.filament]?.name}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
