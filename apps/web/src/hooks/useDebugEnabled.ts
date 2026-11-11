// The dev-only debug panel (TODO 3.20) opens with `?debug` in the URL. Production builds never
// render it at all (App.tsx only imports the panel when `import.meta.env.DEV`).
export function useDebugEnabled(): boolean {
  return new URLSearchParams(window.location.search).has('debug')
}
