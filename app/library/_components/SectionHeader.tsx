import Link from 'next/link'

// Header for a library section page: a back link to the hub plus a title and one-line description.
export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Link href="/library" className="text-caption text-muted hover:text-foreground">
        ← Library
      </Link>
      <h2 className="text-title">{title}</h2>
      <p className="text-caption text-muted">{subtitle}</p>
    </div>
  )
}
