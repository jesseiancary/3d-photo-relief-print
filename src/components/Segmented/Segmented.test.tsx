// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Segmented } from './Segmented'

const options = [
  { value: 'photo', label: 'Photo' },
  { value: 'graphic', label: 'Graphic' },
] as const

describe('Segmented', () => {
  it('marks the selected option and fires onChange on click', async () => {
    const onChange = vi.fn()
    render(<Segmented label="Mode" value="photo" options={options as never} onChange={onChange} />)
    expect(screen.getByRole('radio', { name: 'Photo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Graphic' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(screen.getByRole('radio', { name: 'Graphic' }))
    expect(onChange).toHaveBeenCalledWith('graphic')
  })

  it('exposes an accessible radiogroup label', () => {
    render(<Segmented label="Mode" value="photo" options={options as never} onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument()
  })
})
