import { Button } from '@/components/Button'
import { Hint } from '@/components/Hint'
import { cn } from '@/lib/cn'

interface Busy {
  stage: string
  frac: number
}
interface Status {
  text: string
  tone: 'ok' | 'err'
}

interface Props {
  title: string
  setTitle: (v: string) => void
  namePlaceholder: string
  busy: Busy | null
  status: Status | null
  canExport: boolean
  printerName: string
  usingWorker: boolean
  onExport: () => void
  onPlainExport: () => void
  onWedge: () => void
}

export function ExportCard({
  title,
  setTitle,
  namePlaceholder,
  busy,
  status,
  canExport,
  printerName,
  usingWorker,
  onExport,
  onPlainExport,
  onWedge,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3.5">
      <div className="grid min-w-0 grow basis-55 gap-1">
        <label htmlFor="file-title" className="text-label">
          File Name
        </label>
        <div className="relative flex items-center">
          <input
            id="file-title"
            value={title}
            placeholder={namePlaceholder}
            className="pr-12"
            onChange={(e) => setTitle(e.target.value)}
          />
          <span className="pointer-events-none absolute right-2.25 text-caption text-muted">
            .3mf
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!!busy || !canExport} onClick={onExport}>
          Export 3MF
        </Button>
        <Button
          variant="ghost"
          disabled={!!busy || !canExport}
          onClick={onPlainExport}
          title="Geometry only, for other slicers"
        >
          Plain 3MF
        </Button>
        <Button variant="ghost" disabled={!!busy} onClick={onWedge}>
          Step Wedge
        </Button>
      </div>
      {busy && (
        <div
          className="relative h-5.5 grow basis-full overflow-hidden rounded-sm border border-line bg-surface-2"
          role="progressbar"
          aria-valuenow={Math.round(busy.frac * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            className="absolute inset-y-0 left-0 bg-primary-soft transition-[width] duration-200"
            style={{ width: `${Math.max(4, busy.frac * 100)}%` }}
          />
          <em className="relative pl-2 text-caption not-italic leading-5">{busy.stage}…</em>
        </div>
      )}
      {status && (
        <p
          className={cn(
            'm-0 grow basis-full text-body',
            status.tone === 'ok' ? 'text-ok' : 'text-danger',
          )}
          role="status"
        >
          {status.text}
        </p>
      )}
      <Hint className="grow basis-full">
        Export 3MF builds a {printerName} project with the swaps loaded. Plain 3MF is geometry only,
        plus a swap-instructions.txt, for other slicers. The step wedge prints one patch per layer
        of each filament so you can check TD values.
        {!usingWorker &&
          ' Processing is running on the main thread in this browser, so large exports may pause the page.'}
      </Hint>
    </div>
  )
}
