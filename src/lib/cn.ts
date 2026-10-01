import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge only knows the DEFAULT scale values, so any custom token sharing a utility
// prefix with the defaults must be registered or it mis-merges inside cn():
//  - `text-caption`/`text-label`/… are read as text-COLORS, so a size + color collide
//    (`cn('text-caption','text-primary-accent')` would drop the size).
//  - `rounded-control`/`rounded-card` are unrecognized, so they never collide and a radius
//    override via className silently fails.
//  - `shadow-card`/`-ring`/`-swatch`/`-stage` likewise: the default shadow scale only matches
//    t-shirt sizes (sm/md/lg/…), so our names never collide and `cn('shadow-card','shadow-ring')`
//    keeps BOTH shadows instead of the later overriding. (Color tokens are fine — the color
//    scale is `isAny` — so only size/radius/shadow roles need registering.)
// Registering them in the right class groups / theme scales keeps them merging independently.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['title', 'heading', 'body', 'label', 'caption'] }],
      // custom radius roles; `sm` is a default, only the custom ones need registering
      rounded: [{ rounded: ['control', 'card'] }],
    },
    // custom shadow roles added to the shadow theme scale so they conflict-merge like defaults
    theme: {
      shadow: ['card', 'ring', 'swatch', 'stage'],
    },
  },
})

// Merge conditional class names, with later Tailwind utilities winning over earlier
// conflicting ones (e.g. cn('px-3', condition && 'px-4') → 'px-4'). Used by the UI
// primitives so callers can override a token-backed default via className.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
