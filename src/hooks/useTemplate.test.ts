// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_TEMPLATE } from '@/core/template'

import { useTemplate } from './useTemplate'

// useTemplate reads useSession (to decide whether to load the library picker) and libraryApi (to
// list/fetch saved templates). Both are mocked: the session is a mutable ref so a spec can flip to
// authenticated, and libraryApi is stubbed so no network is touched.
const h = vi.hoisted(() => ({
  session: { current: { status: 'unauthenticated' } as { status: string } },
  list: vi.fn(),
  get: vi.fn(),
}))
vi.mock('next-auth/react', () => ({ useSession: () => h.session.current }))
vi.mock('@/lib/store', () => ({
  libraryApi: { templates: { list: h.list, get: h.get } },
}))

const KEY = 'photo-relief.template.v1'
const ID_KEY = 'photo-relief.templateId.v1'

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

beforeEach(() => {
  h.session.current = { status: 'unauthenticated' }
  h.list.mockReset().mockResolvedValue([])
  h.get.mockReset()
})
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

  // --- library-aware path (authenticated) ---

  it('loads the saved templates for the picker when authenticated', async () => {
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([
      {
        id: 't1',
        name: 'P1S',
        application: 'BambuStudio-1',
        printer: 'P1S',
        version: '1',
        filamentSlots: 4,
      },
    ])
    const { result } = renderHook(() => useTemplate(vi.fn()))
    await waitFor(() => expect(result.current.templates).toHaveLength(1))
    expect(result.current.templates[0].name).toBe('P1S')
    expect(h.list).toHaveBeenCalledTimes(1)
  })

  it('selectTemplate applies a library template and records its id', async () => {
    h.session.current = { status: 'authenticated' }
    h.get.mockResolvedValue({
      id: 't1',
      name: 'P1S',
      application: 'BambuStudio-02.08.02.61',
      config: { printer_settings_id: 'P1S', filament_colour: ['#000', '#111', '#222'] },
    })
    const say = vi.fn()
    const { result } = renderHook(() => useTemplate(say))
    await act(async () => {
      await result.current.selectTemplate('t1')
    })
    expect(h.get).toHaveBeenCalledWith('t1')
    expect(result.current.templateId).toBe('t1')
    expect(result.current.isCustom).toBe(true)
    expect(result.current.summary.filamentSlots).toBe(3)
    expect(localStorage.getItem(ID_KEY)).toBe('t1')
  })

  it('persists the selected templateId across reloads; reset clears it', async () => {
    h.session.current = { status: 'authenticated' }
    h.get.mockResolvedValue({
      id: 't1',
      name: 'P1S',
      application: 'BambuStudio-1',
      config: { filament_colour: ['#000'] },
    })
    const { result, unmount } = renderHook(() => useTemplate(vi.fn()))
    await act(async () => {
      await result.current.selectTemplate('t1')
    })
    unmount()

    const { result: reloaded } = renderHook(() => useTemplate(vi.fn()))
    expect(reloaded.current.templateId).toBe('t1')
    act(() => reloaded.current.resetTemplate())
    expect(reloaded.current.templateId).toBeNull()
    expect(localStorage.getItem(ID_KEY)).toBeNull()
  })
})
