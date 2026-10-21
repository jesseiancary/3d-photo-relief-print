import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { DEFAULT_TEMPLATE, parseTemplate, summarize, type SlicerTemplate } from '@/core/template'
import type { TemplateDTO } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'

import type { Say } from './useStatus'

const TEMPLATE_KEY = 'photo-relief.template.v1'
const TEMPLATE_ID_KEY = 'photo-relief.templateId.v1'

function loadTemplate(): SlicerTemplate {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    if (raw) return JSON.parse(raw) as SlicerTemplate
  } catch {
    /* fall through */
  }
  return DEFAULT_TEMPLATE
}

function loadTemplateId(): string | null {
  try {
    return localStorage.getItem(TEMPLATE_ID_KEY)
  } catch {
    return null
  }
}

/**
 * The slicer template used for Bambu-project export. Holds a working copy (persisted to localStorage,
 * so the anonymous tool remembers it), plus — when signed in — the user's saved template library and
 * which one is active (`templateId`), so a project can record and restore its template.
 */
export function useTemplate(say: Say) {
  const { status } = useSession()
  const [template, setTemplate] = useState<SlicerTemplate>(loadTemplate)
  const [templateId, setTemplateId] = useState<string | null>(loadTemplateId)
  const [templates, setTemplates] = useState<TemplateDTO[]>([])

  // Load the user's saved templates for the picker (only when signed in — the route is auth-gated).
  useEffect(() => {
    if (status !== 'authenticated') {
      setTemplates([])
      return
    }
    let live = true
    void libraryApi.templates
      .list()
      .then((t) => live && setTemplates(t))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [status])

  const persist = (t: SlicerTemplate, id: string | null) => {
    try {
      if (t === DEFAULT_TEMPLATE) localStorage.removeItem(TEMPLATE_KEY)
      else localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t))
      if (id) localStorage.setItem(TEMPLATE_ID_KEY, id)
      else localStorage.removeItem(TEMPLATE_ID_KEY)
    } catch {
      /* ignore */
    }
  }

  const applyTemplate = (t: SlicerTemplate, id: string | null) => {
    setTemplate(t)
    setTemplateId(id)
    persist(t, id)
  }

  const resetTemplate = () => {
    applyTemplate(DEFAULT_TEMPLATE, null)
    say('Reverted to the built-in P2S template')
  }

  const importTemplate = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    try {
      const t = parseTemplate(new Uint8Array(await f.arrayBuffer()))
      applyTemplate(t, null) // a locally-imported template isn't in the library (no id)
      const s = summarize(t)
      say(`Template: ${s.printer} · ${s.application} · ${s.filamentSlots} slots`)
    } catch (e) {
      say((e as Error).message, 'err')
    }
  }

  // Apply a saved library template (or reset to the default when id is null). Used by the picker and
  // when reopening a project with its saved templateId.
  const selectTemplate = async (id: string | null) => {
    if (!id) return resetTemplate()
    try {
      const full = await libraryApi.templates.get(id)
      const t: SlicerTemplate = { application: full.application, config: full.config }
      applyTemplate(t, id)
      const s = summarize(t)
      say(`Template: ${s.printer} · ${s.application} · ${s.filamentSlots} slots`)
    } catch (e) {
      say((e as Error).message, 'err')
    }
  }

  return {
    template,
    templateId,
    templates,
    summary: summarize(template),
    isCustom: template !== DEFAULT_TEMPLATE,
    importTemplate,
    resetTemplate,
    selectTemplate,
  }
}
