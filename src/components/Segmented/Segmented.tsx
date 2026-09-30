import { useId } from 'react'
import { Button } from '@/components/Button'

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div className="segmented" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="sr-only">
        {label}
      </span>
      {options.map((o) => (
        <Button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}
