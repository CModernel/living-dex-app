// Original mark (a ball-style badge, not the Pokémon logo) + two-tone wordmark for the header.
function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="-20 -20 40 40" aria-hidden="true" className="shrink-0">
        <circle r="17" fill="#ffffff" stroke="#1d2433" strokeWidth="2.5" />
        <path d="M-17 0a17 17 0 0 1 34 0z" fill="#E3350D" stroke="#1d2433" strokeWidth="2.5" />
        <path d="M-17 0h34" stroke="#1d2433" strokeWidth="2.5" />
        <circle r="5.5" fill="#ffffff" stroke="#1d2433" strokeWidth="2.5" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-xl font-semibold tracking-tight">
          Living <span className="text-brand">Dex</span>
        </span>
        <span aria-hidden="true" className="mt-1 text-[10px] tracking-[0.16em] text-muted">
          COLLECTION ORGANIZER
        </span>
      </span>
    </span>
  )
}

export default Logo
