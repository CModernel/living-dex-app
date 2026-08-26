import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, test } from 'vitest'
import Layout from './Layout'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

function renderLayout() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Child content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

test('renders nav links and outlet content', () => {
  renderLayout()

  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /lists/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  expect(screen.getByText('Child content')).toBeInTheDocument()
})

test('dark mode toggle button switches the document theme class', () => {
  renderLayout()

  const toggle = screen.getByRole('button', { name: /switch to (dark|light) mode/i })
  const wasDark = document.documentElement.classList.contains('dark')

  fireEvent.click(toggle)

  expect(document.documentElement.classList.contains('dark')).toBe(!wasDark)
})
