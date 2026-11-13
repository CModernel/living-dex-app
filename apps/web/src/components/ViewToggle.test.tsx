import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ViewToggle from './ViewToggle'

describe('ViewToggle', () => {
  it('marks the current view as pressed', () => {
    render(<ViewToggle value="grid" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Switch to grid view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Switch to table view' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches only when the other view is chosen', () => {
    const onChange = vi.fn()
    render(<ViewToggle value="table" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to table view' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Switch to grid view' }))
    expect(onChange).toHaveBeenCalledWith('grid')
  })
})
