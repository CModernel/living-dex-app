import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia; useDarkMode reads it to seed the initial theme.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

// jsdom doesn't implement ResizeObserver either; HomePage's last-column width tracking needs
// the constructor to exist (it never fires callbacks in tests, which is fine — the initial
// synchronous getBoundingClientRect() read in the callback ref covers the width jsdom reports).
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom's default (non-URL-backed) environment doesn't implement localStorage either.
if (!window.localStorage) {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    } satisfies Storage,
  })
}
