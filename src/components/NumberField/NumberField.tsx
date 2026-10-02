import { type ReactNode } from 'react'

import { Hint } from '@/components/Hint'
import { ResettableLabel } from '@/components/ResettableLabel'

interface NumberFieldProps {
  id: string
  label: string
  value: number | null
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
  note?: ReactNode
  defaultValue?: number
  onChange: (v: number | null) => void
}

export function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  placeholder,
  note,
  defaultValue,
  onChange,
}: NumberFieldProps) {
  const canReset = defaultValue !== undefined && value !== defaultValue
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-label">
        {defaultValue === undefined ? (
          label
        ) : (
          <ResettableLabel
            label={label}
            canReset={canReset}
            onReset={() => onChange(defaultValue)}
          />
        )}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="pr-9.5 font-mono"
          onChange={(e) => {
            const v = e.target.value
            if (v === '') return onChange(null)
            const n = Number(v)
            if (Number.isFinite(n)) onChange(n)
          }}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2.25 text-caption text-muted">
            {unit}
          </span>
        )}
      </div>
      {note && <Hint>{note}</Hint>}
    </div>
  )
}
