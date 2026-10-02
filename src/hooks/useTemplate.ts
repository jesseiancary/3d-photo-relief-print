import { useState } from 'react'

import { DEFAULT_TEMPLATE, parseTemplate, summarize, type SlicerTemplate } from '@/core/template'

import type { Say } from './useStatus'

const TEMPLATE_KEY = 'photo-relief.template.v1'

function loadTemplate(): SlicerTemplate {
  const raw = localStorage.getItem(TEMPLATE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as SlicerTemplate
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_TEMPLATE
}

/** The slicer template used for Bambu-project export: import (.3mf), reset, persist, summarise. */
export function useTemplate(say: Say) {
  const [template, setTemplate] = useState<SlicerTemplate>(loadTemplate)

  const applyTemplate = (t: SlicerTemplate) => {
    setTemplate(t)
    if (t === DEFAULT_TEMPLATE) localStorage.removeItem(TEMPLATE_KEY)
    else localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t))
  }
  const resetTemplate = () => {
    applyTemplate(DEFAULT_TEMPLATE)
    say('Reverted to the built-in P2S template')
  }
  const importTemplate = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    try {
      const t = parseTemplate(new Uint8Array(await f.arrayBuffer()))
      applyTemplate(t)
      const s = summarize(t)
      say(`Template: ${s.printer} · ${s.application} · ${s.filamentSlots} slots`)
    } catch (e) {
      say((e as Error).message, 'err')
    }
  }

  return {
    template,
    summary: summarize(template),
    isCustom: template !== DEFAULT_TEMPLATE,
    importTemplate,
    resetTemplate,
  }
}
