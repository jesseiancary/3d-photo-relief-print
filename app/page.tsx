'use client'

import dynamic from 'next/dynamic'

// The tool needs the browser (Web Worker, canvas, localStorage) and localStorage-derived initial
// state, so it can't be server-rendered — mount it client-only to avoid SSR crashes and hydration
// mismatches. This replaces the old Vite src/main.tsx CSR bootstrap.
const App = dynamic(() => import('@/App'), { ssr: false })

export default function Page() {
  return <App />
}
