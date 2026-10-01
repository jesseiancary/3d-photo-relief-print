import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'link' | 'icon'
  label?: string
}

// Shaped variants (primary/ghost/default) share the button geometry; link and icon
// are their own shapes. Styling is token-backed utilities — change a brand color or
// the control radius in the @theme layer and every button follows.
const shaped =
  'inline-flex items-center justify-center gap-1.5 h-8.5 px-3.5 rounded-control border font-medium whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<NonNullable<ButtonProps['variant']> | 'default', string> = {
  default: cn(shaped, 'border-line-strong bg-surface'),
  primary: cn(
    shaped,
    'border-primary bg-primary text-primary-ink font-semibold hover:brightness-[1.06]',
  ),
  ghost: cn(shaped, 'border-line-strong bg-transparent hover:bg-surface-2'),
  link: 'inline-flex items-center cursor-pointer whitespace-nowrap text-caption text-primary-accent disabled:text-muted disabled:cursor-default',
  icon: 'inline-grid place-items-center w-6.5 h-6.5 rounded-sm border border-transparent bg-transparent px-1.5 py-px text-sm leading-none text-muted cursor-pointer hover:enabled:border-line hover:enabled:text-foreground disabled:opacity-35 disabled:cursor-default',
}

// A styled button whose look is chosen by `variant` (default = neutral). `className`
// is merged last so callers can override (e.g. Segmented's selected state).
export function Button({ variant, label, type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(variants[variant ?? 'default'], className)}
      {...props}
    />
  )
}
