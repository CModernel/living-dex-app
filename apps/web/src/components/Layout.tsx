import { Link, Outlet } from 'react-router'

function Layout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 px-4">
      <header className="flex items-center justify-between border-b border-gray-200 py-4">
        <span className="font-semibold">Living Dex</span>
        <nav className="flex gap-4 text-sm">
          <Link to="/">Home</Link>
          <Link to="/lists">Lists</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        Living Dex Organizer
      </footer>
    </div>
  )
}

export default Layout
