// @vitest-environment jsdom
import { DEFAULT_TEMPLATE } from '@/core/template'
import { act, renderHook, waitFor } from '@testing-library/react'
import { strToU8, zipSync } from 'fflate'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTemplate } from './useTemplate'

const KEY = 'photo-relief.template.v1'

function projectFile(name: string, application: string, config: object): File {
  const bytes = zipSync({
    'Metadata/project_settings.config': strToU8(JSON.stringify(config)),
    '3D/3dmodel.model': strToU8(
      `<model><metadata name="Application">${application}</metadata></model>`,
    ),
  })
  return new File([bytes], name, { type: 'model/3mf' })
}
const asFileList = (f: File) => ({ 0: f, length: 1 }) as unknown as FileList

afterEach(() => localStorage.clear())

describe('useTemplate', () => {
  it('defaults to the built-in template (not custom)', () => {
    const { result } = renderHook(() => useTemplate(vi.fn()))
    expect(result.current.isCustom).toBe(false)
    expect(result.current.summary.application).toBe(DEFAULT_TEMPLATE.application)
  })

  it('imports a valid .3mf, reports a summary, and persists it', async () => {
    const say = vi.fn()
    const { result } = renderHook(() => useTemplate(say))
    const file = projectFile('proj.3mf', 'BambuStudio-02.08.02.61', {
      printer_settings_id: 'X1C',
      filament_colour: ['#000000', '#111111'],
    })
    await act(async () => {
      await result.current.importTemplate(asFileList(file))
    })
    await waitFor(() => expect(result.current.isCustom).toBe(true))
    expect(result.current.summary.filamentSlots).toBe(2)
    expect(say).toHaveBeenCalledWith('Template: X1C · BambuStudio-02.08.02.61 · 2 slots')
    expect(localStorage.getItem(KEY)).toBeTruthy()
  })

  it('reports an error for an invalid import without changing the template', async () => {
    const say = vi.fn()
    const { result } = renderHook(() => useTemplate(say))
    const bad = new File([new Uint8Array([1, 2, 3])], 'bad.3mf')
    await act(async () => {
      await result.current.importTemplate(asFileList(bad))
    })
    expect(result.current.isCustom).toBe(false)
    expect(say).toHaveBeenCalledWith(expect.stringMatching(/valid 3MF/), 'err')
  })

  it('resets back to the built-in template and clears persistence', async () => {
    const say = vi.fn()
    const { result } = renderHook(() => useTemplate(say))
    const file = projectFile('proj.3mf', 'OrcaSlicer-02.01.00.59', { filament_colour: ['#000000'] })
    await act(async () => {
      await result.current.importTemplate(asFileList(file))
    })
    await waitFor(() => expect(result.current.isCustom).toBe(true))
    act(() => result.current.resetTemplate())
    expect(result.current.isCustom).toBe(false)
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(say).toHaveBeenCalledWith('Reverted to the built-in P2S template')
  })
})
