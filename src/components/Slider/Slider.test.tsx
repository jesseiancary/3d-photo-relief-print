// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Slider } from './Slider'

describe('Slider', () => {
  it('formats the readout with the given digits and unit', () => {
    render(
      <Slider
        id="s"
        label="Gamma"
        value={1.2345}
        min={0}
        max={2}
        step={0.01}
        digits={2}
        unit="×"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('1.23')).toBeInTheDocument()
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('emits a numeric value on input', () => {
    const onChange = vi.fn()
    render(<Slider id="s" label="Gamma" value={1} min={0} max={2} step={0.1} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1.5' } })
    expect(onChange).toHaveBeenCalledWith(1.5)
  })

  it('enables reset only when off the default', () => {
    const { rerender } = render(
      <Slider
        id="s"
        label="Blur"
        value={0.3}
        min={0}
        max={1}
        step={0.1}
        defaultValue={0.3}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /reset to default/i })).toBeDisabled()
    rerender(
      <Slider
        id="s"
        label="Blur"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        defaultValue={0.3}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /reset to default/i })).toBeEnabled()
  })
})
