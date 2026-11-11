import { renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { useDebugEnabled } from './useDebugEnabled'

afterEach(() => window.history.replaceState(null, '', '/'))

test('is off without the debug param and on with it', () => {
  expect(renderHook(() => useDebugEnabled()).result.current).toBe(false)
  window.history.replaceState(null, '', '/?debug')
  expect(renderHook(() => useDebugEnabled()).result.current).toBe(true)
})
