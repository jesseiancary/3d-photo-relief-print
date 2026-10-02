import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface DropZoneProps {
  className?: string
  activeClassName?: string
  dragging: boolean
  setDragging: (v: boolean) => void
  onFiles: (files: FileList | null) => void
  children: ReactNode
}

// A drop target: wires the drag/drop handlers and applies `activeClassName` while a
// drag is over it. Styling is supplied by the caller as utilities.
export function DropZone({
  className,
  activeClassName,
  dragging,
  setDragging,
  onFiles,
  children,
}: DropZoneProps) {
  return (
    <div
      className={cn(className, dragging && activeClassName)}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        onFiles(e.dataTransfer.files)
      }}
    >
      {children}
    </div>
  )
}
