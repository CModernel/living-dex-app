import { useEffect, useState } from 'react'
import { registerServiceWorker, type PwaHandle } from '../lib/pwa'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

/** Registers the worker in production and exposes "a new version is ready" plus how to apply it. */
export function useServiceWorkerUpdate() {
  const [ready, setReady] = useState(false)
  const [handle, setHandle] = useState<PwaHandle | null>(null)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    setHandle(registerServiceWorker(() => setReady(true)))
  }, [])
  return { updateReady: ready, applyUpdate: () => handle?.applyUpdate() }
}

/** The browser's install prompt (Chrome/Edge/Android) when it is offered; `install()` shows it. */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
  return {
    canInstall: !!event && !installed,
    installed: installed || standalone,
    install: async () => {
      if (!event) return
      await event.prompt()
      await event.userChoice
      setEvent(null)
    },
  }
}
