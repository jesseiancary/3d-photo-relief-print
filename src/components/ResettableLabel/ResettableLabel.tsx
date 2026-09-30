interface ResettableLabelProps {
  label: string
  canReset: boolean
  onReset: () => void
}

// The label text as a button that resets its field to the default value, with a
// "Reset to default" hint that reveals on hover/focus. Shared by NumberField and
// Slider; each wraps this in its own <label htmlFor> context.
export function ResettableLabel({ label, canReset, onReset }: ResettableLabelProps) {
  return (
    <button
      type="button"
      className="reset-title"
      title="Reset to default"
      aria-label={`${label} — reset to default`}
      disabled={!canReset}
      onClick={onReset}
    >
      <span>{label}</span>
      <span className="reset-hint" aria-hidden="true">
        Reset to default
      </span>
    </button>
  )
}
