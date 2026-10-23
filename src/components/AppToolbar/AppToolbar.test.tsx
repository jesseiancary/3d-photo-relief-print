// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppToolbar } from './AppToolbar'

// useSession is a mutable ref so a spec can run anonymous, authenticated, or loading; signOut is a
// spy. ThemeToggle is stubbed so the test doesn't need the PreferencesProvider — it only renders
// in the signed-out state, so specs assert its presence there and its absence otherwise.
const h = vi.hoisted(() => ({
  session: {
    current: { status: 'unauthenticated', data: null } as { status: string; data: unknown },
  },
  signOut: vi.fn(),
}))
vi.mock('next-auth/react', () => ({
  useSession: () => h.session.current,
  signOut: h.signOut,
}))
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

beforeEach(() => {
  h.session.current = { status: 'unauthenticated', data: null }
  h.signOut.mockReset()
})

describe('AppToolbar', () => {
  it('shows a sign-in link and no account controls when signed out', () => {
    render(<AppToolbar />)
    const signIn = screen.getByRole('link', { name: 'Sign in / Create account' })
    expect(signIn).toHaveAttribute('href', '/signin?callbackUrl=/')
    expect(screen.queryByRole('link', { name: 'Library' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('hides the menu behind the email until the trigger is clicked when signed in', async () => {
    h.session.current = { status: 'authenticated', data: { user: { email: 'me@example.com' } } }
    render(<AppToolbar />)

    // Closed initially: the email trigger is present, the menu items are not.
    const trigger = screen.getByRole('button', { name: 'me@example.com' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Library' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in / Create account' })).not.toBeInTheDocument()

    // Opening the menu reveals the nav, Settings, and Sign Out.
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const menuLinks: [string, string][] = [
      ['Library', '/library'],
      ['Projects', '/library/projects'],
      ['Templates', '/library/templates'],
      ['Filaments', '/library/filaments'],
      ['Printers', '/library/printers'],
      ['Settings', '/library/settings'],
    ]
    for (const [name, href] of menuLinks) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }))
    expect(h.signOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('closes the open menu on Escape', async () => {
    h.session.current = { status: 'authenticated', data: { user: { email: 'me@example.com' } } }
    render(<AppToolbar />)

    await userEvent.click(screen.getByRole('button', { name: 'me@example.com' }))
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Library' })).not.toBeInTheDocument()
  })

  it('shows nothing while the session is loading', () => {
    h.session.current = { status: 'loading', data: null }
    render(<AppToolbar />)
    expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in / Create account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Library' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument()
  })
})
