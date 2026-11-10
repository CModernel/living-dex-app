import type { Trophy } from '@living-dex/business-logic'

// Sidebar panel under the collections list: earned trophies highlighted, the rest dimmed with
// their progress. Pure presentation — HomePage computes the trophies.
function TrophiesPanel({ trophies }: { trophies: Trophy[] }) {
  const earnedCount = trophies.filter((t) => t.earned).length
  return (
    <section aria-label="Trophies" className="mt-4 border-t border-border pt-3">
      <h2 className="mb-2 text-sm font-semibold">
        Trophies {earnedCount}/{trophies.length}
      </h2>
      <ul className="flex flex-col gap-1">
        {trophies.map((t) => (
          <li
            key={t.id}
            title={t.description}
            data-earned={t.earned}
            className={`flex items-center justify-between gap-2 text-xs ${t.earned ? 'font-medium' : 'text-muted'}`}
          >
            <span className="truncate">
              {t.earned ? '🏆 ' : ''}
              {t.name}
            </span>
            <span className="shrink-0">
              {t.progress.owned}/{t.progress.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default TrophiesPanel
