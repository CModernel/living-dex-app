import { Link, Outlet } from 'react-router'
import { useDarkMode } from '../hooks/useDarkMode'

function Layout() {
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 px-4 text-foreground">
      <header className="flex items-center justify-between border-b border-border py-4">
        <span className="font-semibold">Living Dex</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/">Home</Link>
          <Link to="/lists">Lists</Link>
          <Link to="/settings">Settings</Link>
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded border border-border px-2 py-1 text-xs"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Outlet />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Living Dex Organizer
      </footer>
    </div>
  )
}

export default Layout
