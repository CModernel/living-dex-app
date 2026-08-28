import ListSwitcher from '../components/ListSwitcher'

function ListsPage() {
  return (
    <div className="w-full max-w-md">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Lists</h1>
      <div className="rounded-lg border border-border bg-surface p-4">
        <ListSwitcher />
      </div>
    </div>
  )
}

export default ListsPage
