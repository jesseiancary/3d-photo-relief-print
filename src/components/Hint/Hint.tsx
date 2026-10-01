import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

// A muted helper-note paragraph shown under controls and sections. The one place the
// body line-height for small copy is defined; `className` is merged for cases like `num`.
export function Hint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 text-caption leading-[1.45] text-muted', className)} {...props} />
}
