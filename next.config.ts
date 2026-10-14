import type { NextConfig } from 'next'

// The relief tool is a browser-only client island (Web Worker, canvas, localStorage); the heavy
// pipeline in src/core + src/worker stays client-side. Server routes (auth, library) land in later
// phases. Turbopack handles the `new Worker(new URL('./relief.worker.ts', import.meta.url))` form.
const nextConfig: NextConfig = {}

export default nextConfig
