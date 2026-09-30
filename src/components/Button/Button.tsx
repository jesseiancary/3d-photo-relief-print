import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'link' | 'icon'
  label?: string
}

// A styled button whose variant is carried by a data attribute (.btn[data-variant=…]),
// so all styling stays in index.css. `variant` omitted → the neutral .btn look.
export function Button({ variant, label, type = 'button', ...props }: ButtonProps) {
  return <button type={type} aria-label={label} className="btn" data-variant={variant} {...props} />
}
