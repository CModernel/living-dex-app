import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { useDarkMode } from './useDarkMode'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

test('toggle flips isDark and the document.documentElement "dark" class', () => {
  const { result } = renderHook(() => useDarkMode())
  const initial = result.current.isDark

  act(() => result.current.toggle())

  expect(result.current.isDark).toBe(!initial)
  expect(document.documentElement.classList.contains('dark')).toBe(!initial)
})
