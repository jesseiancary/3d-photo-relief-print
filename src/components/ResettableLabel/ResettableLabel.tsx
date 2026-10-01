import { cn } from '@/lib/cn'

interface ResettableLabelProps {
  label: string
  canReset: boolean
  onReset: () => void
}

// The label text as a button that resets its field to the default value, with a
// "Reset to default" hint that reveals on hover/focus. Shared by NumberField and
// Slider; each wraps this in its own <label htmlFor> context (which sets the font).
export function ResettableLabel({ label, canReset, onReset }: ResettableLabelProps) {
  return (
    <button
      type="button"
      className={cn(
        'group inline-flex cursor-pointer items-baseline gap-1.5 border-0 bg-transparent p-0 text-inherit',
        'disabled:cursor-default',
      )}
      title="Reset to default"
      aria-label={`${label} — reset to default`}
      disabled={!canReset}
      onClick={onReset}
    >
      <span>{label}</span>
      <span
        className="text-caption text-muted uppercase opacity-0 transition-opacity duration-100 group-[&:not(:disabled):hover]:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      >
        Reset
      </span>
    </button>
  )
}
