import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import HomePage from './HomePage'

test('renders the home heading', () => {
  render(<HomePage />)
  expect(screen.getByRole('heading', { name: /living dex organizer/i })).toBeInTheDocument()
})
