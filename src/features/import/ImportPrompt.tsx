import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

interface Props {
  profiles: number
  template: number
  busy: boolean
  error: string | null
  onImport: () => void
  onDismiss: () => void
}

// One-time banner offering to migrate the anonymous tool's local library into the signed-in account.
function describe(profiles: number, template: number): string {
  const parts: string[] = []
  if (profiles > 0) parts.push(`${profiles} filament profile${profiles === 1 ? '' : 's'}`)
  if (template > 0) parts.push('a custom slicer template')
  return parts.join(' and ')
}

export function ImportPrompt({ profiles, template, busy, error, onImport, onDismiss }: Props) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="grid gap-0.5">
        <strong className="text-body">Import your local library?</strong>
        <span className="text-caption text-muted">
          You have {describe(profiles, template)} saved on this device. Add them to your account?
        </span>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-caption text-destructive">{error}</span>}
        <Button variant="ghost" onClick={onDismiss} disabled={busy}>
          Dismiss
        </Button>
        <Button variant="primary" onClick={onImport} disabled={busy}>
          {busy ? 'Importing…' : 'Import'}
        </Button>
      </div>
    </Card>
  )
}
