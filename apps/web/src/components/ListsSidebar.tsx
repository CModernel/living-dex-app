import { useState, type ReactNode } from 'react'
import { useLists } from '../hooks/useLists'
import { useUserState } from '../state/UserStateContext'
import ListSwitcher from './ListSwitcher'

// 3.31: Home's left sidebar. Desktop: a toggle folds it to a narrow rail (one button per list), remembered as
// `preferences.sidebarCollapsed`. Phone: it becomes an accordion header "Lists · <active list> ▾" (closed by default)
// so the table is not pushed down the screen.
function ListsSidebar({ children }: { children?: ReactNode }) {
  const [state, setState] = useUserState()
  const { lists, activeListId } = useLists()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = !!state.preferences.sidebarCollapsed
  const activeName = lists.find((l) => l.id === activeListId)?.name
  const toggleCollapsed = () =>
    setState((prev) => ({ ...prev, preferences: { ...prev.preferences, sidebarCollapsed: !prev.preferences.sidebarCollapsed } }))

  return (
    <aside
      aria-label="Lists"
      className={`w-full shrink-0 rounded-lg border border-border bg-surface p-3 ${collapsed ? 'md:w-16' : 'md:w-52'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between text-left text-xs font-semibold tracking-wide text-muted uppercase md:hidden"
        >
          <span className="truncate">Lists{activeName ? ` · ${activeName}` : ''}</span>
          <span aria-hidden="true">{mobileOpen ? '▴' : '▾'}</span>
        </button>
        <h2 className={`hidden text-xs font-semibold tracking-wide text-muted uppercase ${collapsed ? '' : 'md:block'}`}>Lists</h2>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="btn btn-sm btn-icon hidden h-7 w-7 md:inline-flex"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <div className={`mt-2 ${mobileOpen ? 'block' : 'hidden'} ${collapsed ? 'md:hidden' : 'md:block'}`}>
        <ListSwitcher />
        {children}
      </div>
      {collapsed && (
        <div className="mt-2 hidden md:block">
          <ListSwitcher compact />
        </div>
      )}
    </aside>
  )
}

export default ListsSidebar
