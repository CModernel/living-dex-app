import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Logo from './Logo'

test('shows the Living Dex wordmark and caption, with the mark hidden from screen readers', () => {
  const { container } = render(<Logo />)
  expect(screen.getByText('Dex')).toHaveClass('text-brand')
  expect(container.textContent).toContain('Living Dex')
  expect(container.textContent).toContain('COLLECTION ORGANIZER')
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})
