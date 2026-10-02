// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberField } from './NumberField'

describe('NumberField', () => {
  it('emits null when cleared and a number when finite', () => {
    const onChange = vi.fn()
    render(<NumberField id="n" label="Height" value={8} onChange={onChange} />)
    const input = screen.getByLabelText('Height') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
    fireEvent.change(input, { target: { value: '12' } })
    expect(onChange).toHaveBeenLastCalledWith(12)
  })

  it('enables the reset affordance only when the value differs from the default', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <NumberField id="n" label="Pitch" value={0.1} defaultValue={0.1} onChange={onChange} />,
    )
    expect(screen.getByRole('button', { name: /reset to default/i })).toBeDisabled()
    rerender(
      <NumberField id="n" label="Pitch" value={0.2} defaultValue={0.1} onChange={onChange} />,
    )
    const reset = screen.getByRole('button', { name: /reset to default/i })
    expect(reset).toBeEnabled()
    await userEvent.click(reset)
    expect(onChange).toHaveBeenCalledWith(0.1)
  })
})
