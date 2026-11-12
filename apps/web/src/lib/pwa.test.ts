import { afterEach, expect, test, vi } from 'vitest'
import { registerServiceWorker } from './pwa'

type Listener = () => void
function fakeWorker(state = 'installing') {
  const listeners: Listener[] = []
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: (_: string, l: Listener) => listeners.push(l),
    fire(next: string) {
      this.state = next
      listeners.forEach((l) => l())
    },
  }
}

function stubServiceWorker({ controller }: { controller: object | null }, installing: ReturnType<typeof fakeWorker> | null) {
  const registration = { installing, waiting: null, addEventListener: vi.fn() }
  vi.stubGlobal('navigator', {
    serviceWorker: { controller, register: vi.fn().mockResolvedValue(registration), addEventListener: vi.fn() },
  })
  return registration
}

afterEach(() => vi.unstubAllGlobals())

test('an installed worker while another one controls the page is an update: onUpdate fires and applyUpdate asks it to skip waiting', async () => {
  const worker = fakeWorker()
  stubServiceWorker({ controller: {} }, worker)
  const onUpdate = vi.fn()
  const handle = registerServiceWorker(onUpdate)!
  await vi.waitFor(() => expect(worker.postMessage).not.toHaveBeenCalled())
  worker.fire('installed')
  expect(onUpdate).toHaveBeenCalledTimes(1)
  handle.applyUpdate()
  expect(worker.postMessage).toHaveBeenCalledWith('SKIP_WAITING')
})

test('the very first install (no controlling worker) is not announced as an update', async () => {
  const worker = fakeWorker()
  stubServiceWorker({ controller: null }, worker)
  const onUpdate = vi.fn()
  registerServiceWorker(onUpdate)
  await Promise.resolve()
  worker.fire('installed')
  expect(onUpdate).not.toHaveBeenCalled()
})

test('without service worker support it does nothing', () => {
  vi.stubGlobal('navigator', {})
  expect(registerServiceWorker(() => {})).toBeNull()
})
