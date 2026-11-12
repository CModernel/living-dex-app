import { expect, test } from '@playwright/test'
import { mockNetwork, startList } from './fixture'

// 3.18: HOME-style boxes (6 × 5) numbered by the box plan.
for (const scheme of ['light', 'dark'] as const) {
  test(`grid view (${scheme}): boxes of 30, mark from the grid, reflected in the table`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await mockNetwork(page)
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await startList(page)

    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: /Grid/ }).click()
    const box1 = page.getByRole('region', { name: 'Box 1' })
    await expect(box1).toBeVisible()
    await expect(page.getByRole('region', { name: 'Box 2' })).toContainText('0/10')
    await box1.getByRole('button', { name: 'Mark Mon 3 as owned' }).click()
    await expect(box1.getByRole('heading')).toContainText('1/30')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `e2e/results/grid-${scheme}.png` })

    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: /Table/ }).click()
    await expect(page.getByRole('checkbox', { name: 'Mark Mon 3 as owned', exact: true })).toBeChecked()
  })
}

// 3.36: view settings belong to each list.
test('each list keeps its own view (grid on one, table on the other) across a reload', async ({ page }) => {
  await mockNetwork(page)
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await startList(page)
  await page.getByRole('group', { name: 'View' }).getByRole('button', { name: /Grid/ }).click()
  await expect(page.getByRole('region', { name: 'Box 1' })).toBeVisible()

  // A second list starts in the table.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('living-dex:user-state')!)
    const [first] = Object.values<{ id: string }>(state.lists)
    const id = 'second'
    state.lists[id] = { ...state.lists[first.id], id, name: 'Second', settings: undefined, createdAt: '2099-01-01T00:00:00.000Z' }
    state.activeListId = id
    localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  })
  await page.reload()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Box 1' })).toHaveCount(0)

  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('living-dex:user-state')!)
    state.activeListId = Object.keys(state.lists).find((id) => id !== 'second')
    localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  })
  await page.reload()
  await expect(page.getByRole('region', { name: 'Box 1' })).toBeVisible()
})
