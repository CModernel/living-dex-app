import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import OwnedProgress from './OwnedProgress'

test('shows counts, percent and an accessible progressbar', () => {
  render(<OwnedProgress progress={{ owned: 5, total: 20, percent: 25 }} />)
  expect(screen.getByText('5 / 20 owned')).toBeInTheDocument()
  expect(screen.getByText('25%')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: /owned progress/i })).toHaveAttribute('aria-valuenow', '25')
})
