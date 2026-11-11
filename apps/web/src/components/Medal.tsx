import type { Trophy } from '@living-dex/business-logic'

// Metal per tier rank (1 = smallest tier). Rank 0 / unearned use the locked grey.
const METALS = [
  { main: '#8a8a92', light: '#b9b9c0', dark: '#3a3a42' }, // locked
  { main: '#B87333', light: '#E3A66B', dark: '#7A4A1E' }, // bronze
  { main: '#9AA3AD', light: '#D5DADF', dark: '#5E6670' }, // silver
  { main: '#D4A017', light: '#F5D76E', dark: '#8A6608' }, // gold
  { main: '#2FA7A0', light: '#8FDCD6', dark: '#17625E' }, // teal
  { main: '#6C3FC4', light: '#B79BEF', dark: '#3C2078' }, // purple (master)
] as const

const DISC = '#2B2B33'
const TRACK = '#555560'
const STAR = '0,-13 3.2,-4.4 12.4,-4 5.1,1.7 7.6,10.5 0,5.4 -7.6,10.5 -5.1,1.7 -12.4,-4 -3.2,-4.4'
const HEX = '0,-32 27.7,-16 27.7,16 0,32 -27.7,16 -27.7,-16'
const DIAMOND = '0,-34 30,0 0,34 -30,0'
const CIRCUMFERENCE = 2 * Math.PI * 28

const ROMAN: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
function roman(n: number): string {
  let out = ''
  for (const [value, glyph] of ROMAN) {
    while (n >= value) {
      out += glyph
      n -= value
    }
  }
  return out || String(n)
}

function label(t: Trophy): string {
  return t.earned ? `${t.name} (earned)` : `${t.name} (locked, ${t.progress.owned}/${t.progress.total})`
}

// One medal as inline SVG: ring for milestones, hexagon for generations, diamond for regional forms.
// Color = rank of the tier, grey while locked. Pure presentation.
function Medal({ trophy, size = 40 }: { trophy: Trophy; size?: number }) {
  const metal = METALS[trophy.earned ? Math.min(trophy.rank, 5) : 0]
  const fg = trophy.earned ? metal.light : '#888890'
  return (
    <svg
      role="img"
      aria-label={label(trophy)}
      data-kind={trophy.kind}
      data-rank={trophy.earned ? trophy.rank : 0}
      width={size}
      height={size}
      viewBox="-40 -40 80 80"
    >
      <title>{label(trophy)}</title>
      {trophy.kind === 'milestone' && (
        <>
          <circle r="34" fill={metal.main} stroke={metal.dark} />
          <circle r="28" fill={DISC} stroke={TRACK} strokeWidth="7" />
          {trophy.earned && (
            <circle
              r="28"
              fill="none"
              stroke={metal.light}
              strokeWidth="7"
              strokeDasharray={`${(CIRCUMFERENCE * (trophy.milestone ?? 100)) / 100} ${CIRCUMFERENCE}`}
              transform="rotate(-90)"
            />
          )}
          <text textAnchor="middle" y="5" fontSize="17" fontWeight="500" fill={fg}>
            {trophy.milestone}
          </text>
        </>
      )}
      {trophy.kind === 'generation' && (
        <>
          <polygon points={HEX} fill={metal.main} stroke={metal.dark} />
          <polygon points={HEX} fill={DISC} transform="scale(0.72)" />
          <text textAnchor="middle" y="5" fontSize="15" fontWeight="500" fill={fg}>
            {roman(trophy.generation ?? 0)}
          </text>
        </>
      )}
      {trophy.kind === 'regional' && (
        <>
          <polygon points={DIAMOND} fill={metal.main} stroke={metal.dark} />
          <polygon points={DIAMOND} fill={DISC} transform="scale(0.7)" />
          <polygon points={STAR} fill={fg} transform="scale(0.7)" />
        </>
      )}
    </svg>
  )
}

export default Medal
