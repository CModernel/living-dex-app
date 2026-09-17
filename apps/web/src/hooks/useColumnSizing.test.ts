import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useColumnSizing } from './useColumnSizing'
import { UserStateProvider } from '../state/UserStateContext'
import { ReactNode } from 'react'
import { createElement } from 'react'

describe('useColumnSizing', () => {
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(UserStateProvider, { initialState: null }, children)
    }
  }

  it('defaults to an empty sizing map', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useColumnSizing(), { wrapper })

    expect(result.current.columnSizing).toEqual({})
  })

  it('accepts a plain value and persists it', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useColumnSizing(), { wrapper })

    act(() => {
      result.current.setColumnSizing({ name: 240 })
    })

    expect(result.current.columnSizing).toEqual({ name: 240 })
  })

  it('accepts an updater function and persists it', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useColumnSizing(), { wrapper })

    act(() => {
      result.current.setColumnSizing((prev) => ({ ...prev, dex: 90 }))
    })

    expect(result.current.columnSizing).toEqual({ dex: 90 })

    act(() => {
      result.current.setColumnSizing((prev) => ({ ...prev, name: 220 }))
    })

    expect(result.current.columnSizing).toEqual({ dex: 90, name: 220 })
  })

  it('persists sizing across multiple calls within the same provider', () => {
    const wrapper = createWrapper()
    const { result, rerender } = renderHook(() => useColumnSizing(), { wrapper })

    expect(result.current.columnSizing).toEqual({})

    act(() => {
      result.current.setColumnSizing({ sprite: 90 })
    })

    expect(result.current.columnSizing).toEqual({ sprite: 90 })

    rerender()

    expect(result.current.columnSizing).toEqual({ sprite: 90 })
  })
})
