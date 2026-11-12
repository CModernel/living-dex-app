import type { Trophy } from '@living-dex/business-logic'
import { useState } from 'react'
import Medal from './Medal'
import TrophyCase from './TrophyCase'

// Sidebar panel under the collections list: only the earned medals, highest rank first, plus a
// button that opens the full trophy case. Pure presentation — HomePage computes the trophies.
function TrophiesPanel({ trophies, listCount = 1 }: { trophies: Trophy[]; listCount?: number }) {
  const [caseOpen, setCaseOpen] = useState(false)
  const earned = trophies.filter((t) => t.earned).sort((a, b) => b.rank - a.rank)
  return (
    <section aria-label="Trophies" className="mt-4 border-t border-border pt-3">
      <h2 className="mb-2 text-sm font-semibold">
        Trophies {earned.length}/{trophies.length}
      </h2>
      {listCount > 1 && <p className="mb-2 text-xs text-muted">Counts every list ({listCount}).</p>}
      {earned.length === 0 ? (
        <p className="text-xs text-muted">No medals yet. Mark Pokémon as owned to earn them.</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {earned.map((t) => (
            <li key={t.id} data-earned="true">
              <Medal trophy={t} size={34} />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setCaseOpen(true)}
        className="btn btn-sm mt-2"
      >
        View all
      </button>
      {caseOpen && <TrophyCase trophies={trophies} onClose={() => setCaseOpen(false)} />}
    </section>
  )
}

export default TrophiesPanel
