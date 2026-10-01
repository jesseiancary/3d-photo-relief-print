import { type ReactNode } from 'react'

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <h2 className="m-0 uppercase text-heading text-muted">{title}</h2>
        {aside}
      </header>
      <div className="grid gap-3 px-3.5 pb-3.5 pt-3">{children}</div>
    </section>
  )
}
