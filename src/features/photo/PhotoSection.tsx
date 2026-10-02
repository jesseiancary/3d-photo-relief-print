import { useRef } from 'react'

import { Button } from '@/components/Button'
import { DropZone } from '@/components/DropZone'
import { Section } from '@/components/Section'

interface Props {
  isSample: boolean
  imageName: string
  dragging: boolean
  setDragging: (v: boolean) => void
  onFiles: (files: FileList | null) => void
}

export function PhotoSection({ isSample, imageName, dragging, setDragging, onFiles }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Section title="Photo">
      <DropZone
        className="flex flex-wrap items-center gap-2.5 rounded-card border-[1.5px] border-dashed border-line-strong p-3"
        activeClassName="border-primary bg-primary-wash"
        dragging={dragging}
        setDragging={setDragging}
        onFiles={onFiles}
      >
        <input
          ref={fileRef}
          id="photo-input"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Button onClick={() => fileRef.current?.click()}>Choose Photo</Button>
        <span className="min-w-0 wrap-anywhere text-caption text-muted">
          {isSample ? 'or drop one here · showing a sample scene' : imageName}
        </span>
      </DropZone>
    </Section>
  )
}
