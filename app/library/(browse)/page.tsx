import Link from 'next/link'

import { Card } from '@/components/Card'
import {
  listFilamentProfiles,
  listPrinterProfiles,
  listProjects,
  listTemplates,
} from '@/server/data'
import { currentUserId } from '@/server/session'

export const dynamic = 'force-dynamic'

// Library hub: a card per section with a live count. The auth gate is in the layout, so a session
// (and user id) is guaranteed here.
export default async function LibraryPage() {
  const userId = await currentUserId()

  const [projects, templates, filaments, printers] = await Promise.all([
    listProjects(userId),
    listTemplates(userId),
    listFilamentProfiles(userId),
    listPrinterProfiles(userId),
  ])

  const sections = [
    {
      href: '/library/projects',
      title: 'Projects',
      desc: 'Saved images + settings you can reopen in the tool.',
      count: `${projects.length} saved`,
    },
    {
      href: '/library/templates',
      title: 'Slicer Templates',
      desc: 'Saved Bambu / Orca projects reused for 3MF export.',
      count: `${templates.length} saved`,
    },
    {
      href: '/library/filaments',
      title: 'Filament Profiles',
      desc: 'Saved filament stacks you can load into the tool.',
      count: `${filaments.length} saved`,
    },
    {
      href: '/library/printers',
      title: 'Printer Profiles',
      desc: 'Bed size and layer geometry per printer.',
      count: `${printers.length} saved`,
    },
    {
      href: '/library/settings',
      title: 'Settings',
      desc: 'Theme and measurement units.',
      count: '',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">Your Library</h1>
        <p className="text-caption text-muted">
          Your projects and reusable building blocks, saved to your account.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="flex h-full flex-col gap-1 p-4 transition-colors hover:border-line-strong">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-label font-semibold group-hover:text-primary-accent">
                  {s.title}
                </h2>
                {s.count && <span className="text-caption text-muted">{s.count}</span>}
              </div>
              <p className="text-caption text-muted">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
