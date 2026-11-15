import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

async function renderNote(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const { default: SupportNote } = await import('./SupportNote')
  render(<SupportNote />)
}

afterEach(() => vi.unstubAllEnvs())

test('without a donate URL nothing is rendered', async () => {
  await renderNote()
  expect(screen.queryByText(/Donations help/)).toBeNull()
})

test('with a donate URL it shows the message and an external, safe link', async () => {
  await renderNote({ VITE_DONATE_URL: 'https://ko-fi.com/example' })
  const link = screen.getByRole('link', { name: 'Support' })
  expect(link).toHaveAttribute('href', 'https://ko-fi.com/example')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link.getAttribute('rel')).toContain('noopener')
  expect(screen.getByText(/don't unlock anything/)).toBeInTheDocument()
})

test('a non-https value is ignored', async () => {
  await renderNote({ VITE_DONATE_URL: 'javascript:alert(1)' })
  expect(screen.queryByRole('link', { name: 'Support' })).toBeNull()
})

test('the community edition ignores the donate URL', async () => {
  await renderNote({ VITE_EDITION: 'community', VITE_DONATE_URL: 'https://ko-fi.com/example' })
  expect(screen.queryByRole('link', { name: 'Support' })).toBeNull()
})
