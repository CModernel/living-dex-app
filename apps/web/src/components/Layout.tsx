import { NavLink, Outlet } from 'react-router'
import { useDarkMode } from '../hooks/useDarkMode'
import { DISCLAIMER } from '../lib/disclaimer'
import Logo from './Logo'

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'font-semibold text-foreground' : 'text-muted hover:text-foreground'
}

function Layout() {
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="flex min-h-svh flex-col text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Logo />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <NavLink to="/" end className={navLinkClassName}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClassName}>
              Dashboard
            </NavLink>
            <NavLink to="/lists" className={navLinkClassName}>
              Lists
            </NavLink>
            <NavLink to="/settings" className={navLinkClassName}>
              Settings
            </NavLink>
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="btn btn-sm btn-icon"
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-start px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        <p className="mx-auto max-w-3xl">{DISCLAIMER}</p>
      </footer>
    </div>
  )
}

export default Layout
