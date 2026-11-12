// 3.39: shown when a new version of the app has been downloaded and is waiting.
function UpdateToast({ onReload }: { onReload: () => void }) {
  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-xl"
    >
      <span>New version available.</span>
      <button type="button" onClick={onReload} className="btn btn-primary btn-sm">
        Reload
      </button>
    </div>
  )
}

export default UpdateToast
