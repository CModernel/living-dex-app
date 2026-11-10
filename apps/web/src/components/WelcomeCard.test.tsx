import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import WelcomeCard from './WelcomeCard'

test('renders the welcome text and dismisses via "Got it"', () => {
  const onDismiss = vi.fn()
  render(<WelcomeCard onDismiss={onDismiss} />)
  expect(screen.getByRole('heading', { name: /welcome to living dex/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /got it/i }))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})
