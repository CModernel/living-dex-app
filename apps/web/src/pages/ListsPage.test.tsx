import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import ListsPage from './ListsPage'

test('renders the lists heading', () => {
  render(<ListsPage />)
  expect(screen.getByRole('heading', { name: /lists/i })).toBeInTheDocument()
})
