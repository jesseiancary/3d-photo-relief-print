import { useId } from 'react'

import { cn } from '@/lib/cn'

// A single-select segmented control (radiogroup). Renders its own buttons rather than
// composing <Button>, since the segment look is distinct from the button variants.
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  const id = useId()
  return (
    <div
      className={cn(
        'flex gap-0.5 rounded-control border border-line bg-surface-2 p-0.5',
        className,
      )}
      role="radiogroup"
      aria-labelledby={id}
    >
      <span id={id} className="sr-only">
        {label}
      </span>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 cursor-pointer whitespace-nowrap rounded-sm px-2.5 py-1.25 text-body text-muted hover:text-foreground',
              on && 'bg-surface font-medium text-foreground shadow-ring',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
