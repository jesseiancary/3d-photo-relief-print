import { ResettableLabel } from '@/components/ResettableLabel'

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
  defaultValue?: number
  onChange: (v: number) => void
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  digits = 0,
  hint,
  defaultValue,
  onChange,
}: SliderProps) {
  const canReset = defaultValue !== undefined && value !== defaultValue
  return (
    <div className="slider">
      <label htmlFor={id}>
        {defaultValue === undefined ? (
          <span>{label}</span>
        ) : (
          <ResettableLabel
            label={label}
            canReset={canReset}
            onReset={() => onChange(defaultValue)}
          />
        )}
        <output htmlFor={id} className="num">
          {value.toFixed(digits)}
          {unit && <span className="unit">{unit}</span>}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
