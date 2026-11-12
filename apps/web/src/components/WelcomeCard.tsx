// Dismissible intro on Home (3.8 #13, shortened in 3.28 to one sentence). The parent owns visibility (persisted preference).
function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section aria-label="Welcome" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
      <div className="min-w-60 flex-1">
        <h2 className="font-semibold">Welcome to Living Dex</h2>
        <p className="text-muted">Tap a Pokémon to mark it as owned. Your data stays on this device; back it up in Settings.</p>
      </div>
      <button type="button" onClick={onDismiss} className="btn btn-primary">
        Got it
      </button>
    </section>
  )
}

export default WelcomeCard
