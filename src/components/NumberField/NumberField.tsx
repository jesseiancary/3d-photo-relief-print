import { type ReactNode } from 'react'

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
  onChange,
}: NumberFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-unit">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') return onChange(null)
            const n = Number(v)
            if (Number.isFinite(n)) onChange(n)
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {note && <p className="hint">{note}</p>}
    </div>
  )
}
