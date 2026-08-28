import { NavLink, Outlet } from 'react-router'
import { useDarkMode } from '../hooks/useDarkMode'

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'font-semibold text-foreground' : 'text-muted hover:text-foreground'
}

function Layout() {
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="flex min-h-svh flex-col text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">Living Dex</span>
          <nav className="flex items-center gap-5 text-sm">
            <NavLink to="/" end className={navLinkClassName}>
              Home
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
              className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-border/30"
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Living Dex Organizer
      </footer>
    </div>
  )
}

export default Layout
