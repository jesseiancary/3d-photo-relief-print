// @vitest-environment jsdom
import { defaultFilaments, defaultSettings } from '@/core/defaults'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilamentStack } from './FilamentStack'

const print = defaultSettings().print

function renderStack() {
  const filaments = defaultFilaments()
  const onChange = vi.fn()
  render(
    <FilamentStack
      filaments={filaments}
      bands={null}
      print={print}
      onChange={onChange}
      onStatus={vi.fn()}
    />,
  )
  return { filaments, onChange }
}

describe('FilamentStack', () => {
  it('adds a preset filament on top', () => {
    const { filaments, onChange } = renderStack()
    fireEvent.change(screen.getByLabelText('Add Filament'), { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0]
    expect(next).toHaveLength(filaments.length + 1)
    expect(next[next.length - 1]).toMatchObject({ name: 'Bambu Basic Blue Gray' })
  })

  it('removes a filament', () => {
    const { filaments, onChange } = renderStack()
    fireEvent.click(screen.getByRole('button', { name: `Remove ${filaments[0].name}` }))
    const next = onChange.mock.calls[0][0]
    expect(next).toHaveLength(filaments.length - 1)
    expect(next.find((f: { id: string }) => f.id === filaments[0].id)).toBeUndefined()
  })

  it('reorders filaments with the move buttons', () => {
    const { filaments, onChange } = renderStack()
    // rows render top-first, so the base filament's Move Up is the last one; it swaps 0 and 1
    fireEvent.click(screen.getAllByRole('button', { name: 'Move Up' }).at(-1)!)
    const next = onChange.mock.calls[0][0]
    expect(next.map((f: { id: string }) => f.id).slice(0, 2)).toEqual([
      filaments[1].id,
      filaments[0].id,
    ])
  })

  it('updates a filament color (uppercased)', async () => {
    const { filaments, onChange } = renderStack()
    const swatch = screen.getByLabelText(`${filaments[0].name} color`)
    await userEvent.clear(swatch).catch(() => {}) // color inputs ignore clear; set value directly
    fireEvent.input(swatch, { target: { value: '#abcdef' } })
    const next = onChange.mock.calls.at(-1)![0]
    expect(next.find((f: { id: string }) => f.id === filaments[0].id).color).toBe('#ABCDEF')
  })
})
