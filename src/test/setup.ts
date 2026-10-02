import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Unmount any rendered React trees between tests so DOM specs don't leak state.
// Harmless in the node environment (no DOM rendered there).
afterEach(() => {
  cleanup()
})
