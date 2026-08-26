import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import SettingsPage from './SettingsPage'

test('renders the settings heading', () => {
  render(<SettingsPage />)
  expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
})
