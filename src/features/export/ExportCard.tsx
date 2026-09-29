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
    <div className="export-card">
      <div className="field grow">
        <label htmlFor="file-title">File name</label>
        <div className="input-unit">
          <input
            id="file-title"
            value={title}
            placeholder={namePlaceholder}
            onChange={(e) => setTitle(e.target.value)}
          />
          <span className="unit">.3mf</span>
        </div>
      </div>
      <div className="export-actions">
        <button
          type="button"
          className="btn primary"
          disabled={!!busy || !canExport}
          onClick={onExport}
        >
          Export 3MF
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!!busy || !canExport}
          onClick={onPlainExport}
          title="Geometry only, for other slicers"
        >
          Plain 3MF
        </button>
        <button type="button" className="btn ghost" disabled={!!busy} onClick={onWedge}>
          Step wedge
        </button>
      </div>
      {busy && (
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={Math.round(busy.frac * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${Math.max(4, busy.frac * 100)}%` }} />
          <em>{busy.stage}…</em>
        </div>
      )}
      {status && (
        <p className={`status ${status.tone}`} role="status">
          {status.text}
        </p>
      )}
      <p className="hint">
        Export 3MF builds a {printerName} project with the swaps loaded. Plain 3MF is geometry only,
        plus a swap-instructions.txt, for other slicers. The step wedge prints one patch per layer
        of each filament so you can check TD values.
        {!usingWorker &&
          ' Processing is running on the main thread in this browser, so large exports may pause the page.'}
      </p>
    </div>
  )
}
