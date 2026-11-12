/* Living Dex service worker (3.39 / 3.45). Hand-written, no build step except the BUILD_ID stamp (vite.config.ts).
 *
 * - App shell: navigations are network-first with the cached index.html as the offline fallback; hashed /assets/*
 *   are cache-first (immutable); other same-origin files are stale-while-revalidate.
 * - Dataset (…/data/vN/*.json on the CDN): stale-while-revalidate, so a returning user works offline and gets the
 *   fresh copy next time. The URL carries the data version (v1), so a new data version is a new cache entry.
 * - Sprites (cross-origin images): cache-first, fetched with CORS so entries stay small (opaque responses are
 *   padded to ~7 MB each by browsers); capped to MAX_SPRITES. The first view of each sprite needs internet.
 * - Updates: a new worker waits; the page shows "New version available" and sends SKIP_WAITING.
 */
const BUILD_ID = '__BUILD_ID__'
const SHELL = `ld-shell-${BUILD_ID}`
const DATA = 'ld-data-v1'
const SPRITES = 'ld-sprites-v1'
const KEEP = new Set([SHELL, DATA, SPRITES])
const MAX_SPRITES = 3000
const SCOPE = self.registration.scope // e.g. https://host/living-dex-app/

self.addEventListener('install', (event) => {
  // Precache the shell entry so the very first offline visit already works.
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add(new Request(SCOPE, { cache: 'reload' })).catch(() => {})))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (!KEEP.has(name)) await caches.delete(name)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => undefined)
  return cached ?? (await network) ?? Response.error()
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(SCOPE, res.clone())
    return res
  } catch {
    return (await cache.match(SCOPE)) ?? (await cache.match(request)) ?? Response.error()
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const res = await fetch(request)
  if (res.ok) cache.put(request, res.clone())
  return res
}

async function sprite(request) {
  const cache = await caches.open(SPRITES)
  const cached = await cache.match(request.url)
  if (cached) return cached
  try {
    const res = await fetch(request.url, { mode: 'cors' })
    if (res.ok) {
      await cache.put(request.url, res.clone())
      const keys = await cache.keys()
      for (const key of keys.slice(0, Math.max(0, keys.length - MAX_SPRITES))) await cache.delete(key)
    }
    return res
  } catch {
    return fetch(request) // a host without CORS: just show it, don't cache it
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirstNavigation(request))
  } else if (/\/data\/v\d+\/.+\.json$/.test(url.pathname) || url.pathname.endsWith('test-dataset.json')) {
    event.respondWith(staleWhileRevalidate(request, DATA))
  } else if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(sprite(request))
  } else if (url.origin === self.location.origin && url.pathname.startsWith(new URL(SCOPE).pathname + 'assets/')) {
    event.respondWith(cacheFirst(request, SHELL))
  } else if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL))
  }
})
