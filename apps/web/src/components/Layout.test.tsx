import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, test } from 'vitest'
import Layout from './Layout'

test('renders nav links and outlet content', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Child content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /lists/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  expect(screen.getByText('Child content')).toBeInTheDocument()
})
