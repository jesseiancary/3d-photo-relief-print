'use client'

import dynamic from 'next/dynamic'

// Same client island as the home page (the tool can't SSR — it reads localStorage and spins up a
// Web Worker), but hydrated with a project id so App loads that project instead of the sample.
const App = dynamic(() => import('@/App'), { ssr: false })

export function ProjectTool({ projectId }: { projectId: string }) {
  return <App projectId={projectId} />
}
