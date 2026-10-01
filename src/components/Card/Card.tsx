import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

// A surface panel: the design-system card shell (surface bg, line border, card radius,
// elevation). Replaces the ad-hoc .export-card / .preview-card classes in features.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-card', className)}
      {...props}
    />
  )
}
