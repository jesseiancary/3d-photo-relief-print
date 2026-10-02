// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DropZone } from './DropZone'

function renderZone(dragging = false) {
  const setDragging = vi.fn()
  const onFiles = vi.fn()
  const { container } = render(
    <DropZone
      className="base"
      activeClassName="active"
      dragging={dragging}
      setDragging={setDragging}
      onFiles={onFiles}
    >
      <span>drop here</span>
    </DropZone>,
  )
  return { zone: container.firstChild as Element, setDragging, onFiles }
}

describe('DropZone', () => {
  it('turns dragging on over the target and off on leave', () => {
    const { zone, setDragging } = renderZone()
    fireEvent.dragOver(zone)
    expect(setDragging).toHaveBeenLastCalledWith(true)
    fireEvent.dragLeave(zone)
    expect(setDragging).toHaveBeenLastCalledWith(false)
  })

  it('clears dragging and forwards the dropped files', () => {
    const { zone, setDragging, onFiles } = renderZone()
    const files = { length: 1, 0: new File(['x'], 'a.png') } as unknown as FileList
    fireEvent.drop(zone, { dataTransfer: { files } })
    expect(setDragging).toHaveBeenLastCalledWith(false)
    expect(onFiles).toHaveBeenCalledWith(files)
  })

  it('applies the active class only while dragging', () => {
    expect((renderZone(false).zone as HTMLElement).className).toBe('base')
    expect((renderZone(true).zone as HTMLElement).className).toContain('active')
  })
})
