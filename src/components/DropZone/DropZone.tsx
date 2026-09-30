import type { ReactNode } from 'react'

interface DropZoneProps {
  className: string
  dragging: boolean
  setDragging: (v: boolean) => void
  onFiles: (files: FileList | null) => void
  children: ReactNode
}

// A drop target: wires the drag/drop handlers and toggles the `.over` state class on a
// caller-supplied base class (e.g. "dropzone", "stage"). Styling lives in those classes.
export function DropZone({ className, dragging, setDragging, onFiles, children }: DropZoneProps) {
  return (
    <div
      className={`${className}${dragging ? ' over' : ''}`}
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
