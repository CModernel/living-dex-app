import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import UpdateToast from './UpdateToast'

test('announces the update and reloads on request', () => {
  const onReload = vi.fn()
  render(<UpdateToast onReload={onReload} />)
  expect(screen.getByRole('status')).toHaveTextContent('New version available')
  fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
  expect(onReload).toHaveBeenCalledTimes(1)
})
