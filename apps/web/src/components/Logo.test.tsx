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

test('the mark is an abstract storage box, not a ball: no circle-in-circle, red or half-and-half composition', () => {
  const { getByTestId } = render(<Logo />)
  const mark = getByTestId('logo-mark')
  expect(mark.querySelectorAll('rect').length).toBeGreaterThanOrEqual(1)
  expect(mark.querySelectorAll('circle')).toHaveLength(9)
  expect(mark.innerHTML.toLowerCase()).not.toContain('#e3350d')
  const radii = [...mark.querySelectorAll('circle')].map((c) => c.getAttribute('r'))
  expect(new Set(radii).size).toBe(1)
})
