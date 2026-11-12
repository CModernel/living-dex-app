// 3.39 PWA plumbing: registers /sw.js (production only) and reports when a new version is waiting.

export type PwaHandle = { applyUpdate: () => void }

/**
 * Registers the service worker and calls `onUpdate` when an updated worker has installed and is waiting. Returns a
 * handle whose `applyUpdate` activates it and reloads the page once it has taken over. A first-ever install (no
 * previous worker controlling the page) is not an update, so no prompt is shown for it.
 */
export function registerServiceWorker(onUpdate: () => void): PwaHandle | null {
  if (!('serviceWorker' in navigator)) return null
  let waiting: ServiceWorker | null = null
  let reloading = false

  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
    const track = (worker: ServiceWorker | null) => {
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          waiting = worker
          onUpdate()
        }
      })
    }
    if (registration.waiting && navigator.serviceWorker.controller) {
      waiting = registration.waiting
      onUpdate()
    }
    track(registration.installing)
    registration.addEventListener('updatefound', () => track(registration.installing))
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  return { applyUpdate: () => waiting?.postMessage('SKIP_WAITING') }
}
