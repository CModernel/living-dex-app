import { useState, type ReactNode } from 'react'
import { useLists } from '../hooks/useLists'
import { useUserState } from '../state/UserStateContext'
import Dialog from './Dialog'
import ListSwitcher from './ListSwitcher'
import TierPicker from './TierPicker'

// 3.31: Home's left sidebar. Desktop: a toggle folds it to a narrow rail (one button per list), remembered as
// `preferences.sidebarCollapsed`. Phone: it becomes an accordion header "Lists · <active list> ▾" (closed by default)
// so the table is not pushed down the screen.
// 3.61: one header row with two identical icon buttons ("+" and collapse); in the rail the expand button is on top and
// "+" closes the list, all centred on the same axis. The create dialog lives here so both states share one "+".

// A sidebar-panel glyph: a frame with a divider; the arrow shows where the panel goes.
function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
      <path d="M6 3v10" />
      <path d={collapsed ? 'M9.5 6.5 11.5 8l-2 1.5' : 'M11.5 6.5 9.5 8l2 1.5'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ListsSidebar({ children }: { children?: ReactNode }) {
  const [state, setState] = useUserState()
  const { lists, activeListId } = useLists()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const collapsed = !!state.preferences.sidebarCollapsed
  const activeName = lists.find((l) => l.id === activeListId)?.name
  const toggleCollapsed = () =>
    setState((prev) => ({ ...prev, preferences: { ...prev.preferences, sidebarCollapsed: !prev.preferences.sidebarCollapsed } }))

  const createButton = (size: string) => (
    <button
      type="button"
      onClick={() => setIsCreateOpen(true)}
      aria-label="Create new list"
      title="Create new list"
      className={`btn btn-sm btn-icon ${size} text-base leading-none`}
    >
      +
    </button>
  )

  return (
    <aside
      aria-label="Lists"
      className={`w-full shrink-0 rounded-lg border border-border bg-surface p-3 transition-[width] duration-200 ${collapsed ? 'md:w-16' : 'md:w-52'}`}
    >
      <div className={`flex items-center gap-1.5 ${collapsed ? 'md:justify-center' : 'justify-between'}`}>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between text-left text-xs font-semibold tracking-wide text-muted uppercase md:hidden"
        >
          <span className="truncate">Lists{activeName ? ` · ${activeName}` : ''}</span>
          <span aria-hidden="true">{mobileOpen ? '▴' : '▾'}</span>
        </button>
        <h2 className={`hidden flex-1 text-xs font-semibold tracking-wide text-muted uppercase ${collapsed ? '' : 'md:block'}`}>Lists</h2>
        <span className={collapsed ? 'md:hidden' : ''}>{createButton('h-7 w-7')}</span>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`btn btn-sm btn-icon hidden md:inline-flex ${collapsed ? 'h-8 w-8' : 'h-7 w-7'}`}
        >
          <PanelIcon collapsed={collapsed} />
        </button>
      </div>
      <div className={`mt-2 ${mobileOpen ? 'block' : 'hidden'} ${collapsed ? 'md:hidden' : 'md:block'}`}>
        <ListSwitcher showCreate={false} />
        {children}
      </div>
      {collapsed && (
        <div className="mt-2 hidden flex-col items-center gap-1 md:flex">
          <ListSwitcher compact showCreate={false} />
          {createButton('h-8 w-8')}
        </div>
      )}
      {isCreateOpen && (
        <Dialog label="Create new list" onClose={() => setIsCreateOpen(false)} className="w-[36rem]">
          <TierPicker onCreated={() => setIsCreateOpen(false)} />
        </Dialog>
      )}
    </aside>
  )
}

export default ListsSidebar
