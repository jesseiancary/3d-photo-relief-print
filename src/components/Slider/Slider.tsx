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
          <button
            type="button"
            className="slider-title"
            title="Reset to default"
            aria-label={`${label} — reset to default`}
            disabled={!canReset}
            onClick={() => onChange(defaultValue)}
          >
            <span>{label}</span>
            <span className="reset-hint" aria-hidden="true">
              Reset to default
            </span>
          </button>
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
