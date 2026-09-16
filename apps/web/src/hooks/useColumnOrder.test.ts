import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useColumnOrder } from './useColumnOrder'
import { UserStateProvider } from '../state/UserStateContext'
import { ReactNode } from 'react'
import { createElement } from 'react'

describe('useColumnOrder', () => {
  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(UserStateProvider, { initialState: null }, children)
    }
  }

  it('returns default column order from preferences', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useColumnOrder(), { wrapper })

    expect(result.current.columnOrder).toEqual([
      'sprite',
      'name',
      'types',
      'dex',
      'generation',
      'region',
      'evolutionStage',
      'owned',
    ])
  })

  it('accepts a plain value and persists it', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useColumnOrder(), { wrapper })

    act(() => {
      result.current.setColumnOrder(['name', 'sprite', 'types', 'dex', 'generation', 'region', 'evolutionStage', 'owned'])
    })

    expect(result.current.columnOrder).toEqual([
      'name',
      'sprite',
      'types',
      'dex',
      'generation',
      'region',
      'evolutionStage',
      'owned',
    ])
  })

  it('accepts an updater function and persists it', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useColumnOrder(), { wrapper })

    act(() => {
      result.current.setColumnOrder((prev) => {
        const next = prev.filter((id) => id !== 'dex')
        next.splice(0, 0, 'dex')
        return next
      })
    })

    expect(result.current.columnOrder[0]).toBe('dex')
  })

  it('persists order across multiple calls within the same provider', () => {
    const wrapper = createWrapper()
    const { result, rerender } = renderHook(() => useColumnOrder(), { wrapper })

    // Initial order
    expect(result.current.columnOrder[0]).toBe('sprite')

    // Change order
    act(() => {
      result.current.setColumnOrder(['name', 'sprite', 'types', 'dex', 'generation', 'region', 'evolutionStage', 'owned'])
    })

    expect(result.current.columnOrder[0]).toBe('name')

    // Rerender (simulates component update) - should preserve the order
    rerender()

    expect(result.current.columnOrder[0]).toBe('name')
  })
})
