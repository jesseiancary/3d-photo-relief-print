import { useId, type ReactNode } from 'react'

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h2>{title}</h2>
        {aside}
      </header>
      <div className="section-body">{children}</div>
    </section>
  )
}

interface SliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  digits?: number
  hint?: string
  onChange: (v: number) => void
}

export function Slider({ id, label, value, min, max, step, unit, digits = 0, hint, onChange }: SliderProps) {
  return (
    <div className="slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id} className="num">
          {value.toFixed(digits)}
          {unit && <span className="unit">{unit}</span>}
        </output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

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

export function NumberField({ id, label, value, min, max, step, unit, placeholder, note, onChange }: NumberFieldProps) {
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

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div className="segmented" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="sr-only">{label}</span>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
