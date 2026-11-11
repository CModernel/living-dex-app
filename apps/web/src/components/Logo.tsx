// Original mark: a storage box (3x3 grid of slots, one filled) + two-tone wordmark. Deliberately NOT
// a ball or any Pokémon logo/lettering (see the IP guide, rule 2).
function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="-20 -20 40 40" aria-hidden="true" className="shrink-0" data-testid="logo-mark">
        <rect x="-18" y="-18" width="36" height="36" rx="9" fill="#208aef"/><rect x="-18" y="-18" width="36" height="36" rx="9" fill="none" stroke="#0C447C" strokeWidth="2"/><circle cx="-9" cy="-9" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="0" cy="-9" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="9" cy="-9" r="3.4" fill="#FFC53D"/><circle cx="-9" cy="0" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="0" cy="0" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="9" cy="0" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="-9" cy="9" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="0" cy="9" r="3.4" fill="#ffffff" fillOpacity="0.92"/><circle cx="9" cy="9" r="3.4" fill="#ffffff" fillOpacity="0.92"/>
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
