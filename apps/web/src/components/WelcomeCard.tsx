// Dismissible intro on Home (3.8 #13). The parent owns visibility (persisted preference).
function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section aria-label="Welcome" className="mb-4 rounded-lg border border-border bg-surface p-4 text-sm">
      <h2 className="mb-1 font-semibold">Welcome to Living Dex</h2>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-muted">
        <li>Click a Pokémon (or its checkbox) to mark it as owned.</li>
        <li>Use the book icon on a row to record which game you got it in.</li>
        <li>Make several collections in the sidebar; each keeps its own progress.</li>
        <li>Back up or move your data from Settings → Export / Import.</li>
      </ul>
      <button
        type="button"
        onClick={onDismiss}
        className="btn btn-primary"
      >
        Got it
      </button>
    </section>
  )
}

export default WelcomeCard
