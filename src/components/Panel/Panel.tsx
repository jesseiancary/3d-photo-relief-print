import type { ReactNode } from 'react'

// A titled surface panel for the workspace (the plan sections). Its heading matches
// Section's uppercase label; the two primitives are the only places that heading lives.
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-2.5 rounded-card border border-line bg-surface px-3.5 pb-3.5 pt-3">
      <h3 className="m-0 uppercase text-heading text-muted">{title}</h3>
      {children}
    </section>
  )
}
