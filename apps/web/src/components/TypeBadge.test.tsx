import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import TypeBadge from './TypeBadge'

test('renders the type name', () => {
  render(<TypeBadge type="grass" />)
  expect(screen.getByText('grass')).toBeInTheDocument()
})
