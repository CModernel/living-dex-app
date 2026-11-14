import {
  evaluateTrophies,
  resolveListTiers,
  statsByForm,
  statsByGame,
  statsByGeneration,
  statsByType,
  unionOwned,
} from '@living-dex/business-logic'
import { TIERS } from '@cmodernel/living-dex-tiers'
import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import DonutChart, { type DonutSlice } from '../components/DonutChart'
import Dialog from '../components/Dialog'
import StatBars from '../components/StatBars'
import TierPicker from '../components/TierPicker'
import { useDataset } from '../hooks/useDataset'
import { useLists } from '../hooks/useLists'
import { gameStyle } from '../lib/gameColors'
import { typeColor } from '../lib/pokemonTypeColors'
import { TIER_LABELS, TROPHY_TIER_ORDER, useTierSets } from '../lib/tiers'
import { useIsHydrated } from '../state/UserStateContext'

const TOP_GAMES = 6

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

// 3.64: the user's overview across ALL lists: totals, one card per list, where the Pokémon came from and how the
// collection spreads over types, generations and forms. With no list yet it is where a new user lands.
function DashboardPage() {
  const navigate = useNavigate()
  const { search } = useLocation() // kept across redirects so `?debug` survives
  const goHome = () => navigate({ pathname: '/', search })
  const hydrated = useIsHydrated()
  const { lists, activeListId, switchTo } = useLists()
  const { dataset, loading, error } = useDataset()
  const tierSets = useTierSets(dataset)
  const [creating, setCreating] = useState(false)

  const stats = useMemo(() => {
    if (!dataset) return null
    const entries = Object.values(dataset.pokemon)
    const owned = unionOwned(lists)
    const trophies = evaluateTrophies(
      TROPHY_TIER_ORDER.map((id) => ({ id, name: TIER_LABELS[id], entries: entries.filter(TIERS[id].predicate) })),
      owned,
    )
    const ownedKnown = entries.filter((e) => owned.has(e.slug)).length
    return {
      owned: ownedKnown,
      total: entries.length,
      trophiesEarned: trophies.filter((t) => t.earned).length,
      trophyCount: trophies.length,
      byType: statsByType(entries, owned),
      byGeneration: statsByGeneration(entries, owned),
      byForm: statsByForm(entries, owned),
    }
  }, [dataset, lists])

  const gameSlices = useMemo<DonutSlice[]>(() => {
    const shares = statsByGame(lists)
    const top = shares.slice(0, TOP_GAMES).map((share) => ({
      key: share.gameId ?? 'none',
      label: share.label,
      value: share.count,
      color: share.gameId === null ? '#9ca3af' : gameStyle(share.gameId).color,
    }))
    const rest = shares.slice(TOP_GAMES).reduce((sum, share) => sum + share.count, 0)
    return rest > 0 ? [...top, { key: 'other', label: 'Other games', value: rest, color: '#6b7280' }] : top
  }, [lists])

  if (!hydrated) return null

  if (lists.length === 0) {
    return (
      <div className="mt-10 flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-dashed border-border p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Living Dex</h1>
        <p className="text-sm text-muted">Create your first list to start tracking your collection.</p>
        <button type="button" onClick={() => setCreating(true)} className="btn btn-primary">
          Create your first list
        </button>
        {creating && (
          <Dialog label="Create your first list" onClose={() => setCreating(false)} className="w-[36rem]">
            <TierPicker onCreated={goHome} />
          </Dialog>
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      {loading && <p className="text-muted">Loading Pokémon data…</p>}
      {error && <p className="text-muted">Failed to load dataset: {error.message}</p>}
      {stats && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Pokémon owned (all lists)" value={`${stats.owned} / ${stats.total}`} />
            <Stat label="Lists" value={String(lists.length)} />
            <Stat label="Trophies" value={`${stats.trophiesEarned} / ${stats.trophyCount}`} />
          </div>
          <Card title="Your lists">
            <ul className="flex flex-col gap-3">
              {lists.map((list) => {
                const tier = resolveListTiers(list).tier
                const inTier = tierSets?.[tier]
                const total = inTier?.size ?? 0
                const owned = inTier ? list.ownedIds.filter((slug) => inTier.has(slug)).length : 0
                const percent = total > 0 ? Math.round((owned / total) * 100) : 0
                return (
                  <li key={list.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-40 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate font-medium">
                          {list.icon ? `${list.icon} ` : ''}
                          {list.name}
                          {list.id === activeListId && <span className="ml-2 text-xs text-muted">(active)</span>}
                        </span>
                        <span className="text-xs text-muted tabular-nums">
                          {TIER_LABELS[tier]} · {owned} / {total}
                        </span>
                      </div>
                      <div role="progressbar" aria-label={`${list.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-label={`Open ${list.name}`}
                      onClick={() => {
                        switchTo(list.id)
                        goHome()
                      }}
                    >
                      Open
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Where they come from">
              <DonutChart slices={gameSlices} centerLabel="Tag the games your Pokémon came from to see this." ariaLabel="Owned Pokémon by game of origin" />
            </Card>
            <Card title="Forms">
              <StatBars rows={stats.byForm} ariaLabel="Owned by form" />
            </Card>
            <Card title="By type">
              <StatBars rows={stats.byType} colorOf={(row) => typeColor(row.key)} ariaLabel="Owned by type" />
            </Card>
            <Card title="By generation">
              <StatBars rows={stats.byGeneration} ariaLabel="Owned by generation" />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardPage
