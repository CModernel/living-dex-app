import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useInstallPrompt } from './usePwa'

function promptEvent() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome: 'accepted' })
  return event
}

test('the install button is offered only after the browser fires beforeinstallprompt, and shows the prompt', async () => {
  const { result } = renderHook(() => useInstallPrompt())
  expect(result.current.canInstall).toBe(false)
  const event = promptEvent()
  act(() => void window.dispatchEvent(event))
  expect(result.current.canInstall).toBe(true)
  expect(event.defaultPrevented).toBe(true)
  await act(() => result.current.install())
  expect(event.prompt).toHaveBeenCalled()
  expect(result.current.canInstall).toBe(false)
})

test('appinstalled marks it installed', () => {
  const { result } = renderHook(() => useInstallPrompt())
  act(() => void window.dispatchEvent(new Event('appinstalled')))
  expect(result.current.installed).toBe(true)
})
