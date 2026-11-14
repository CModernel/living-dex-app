import { expect, test } from '@playwright/test'
import { mockNetwork, startList } from './fixture'

// 3.64: the dashboard summarises every list; a brand-new user lands on it with a button to create the first list.
for (const scheme of ['light', 'dark'] as const) {
  test(`dashboard (${scheme}): first-list button, then totals and charts`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await mockNetwork(page)
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page).toHaveURL(/dashboard/)
    await startList(page)
    await page.getByRole('checkbox', { name: 'Mark Mon 1 as owned', exact: true }).check()
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Where they come from' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Owned by type' })).toBeVisible()
    await page.screenshot({ path: `e2e/results/dashboard-${scheme}.png`, fullPage: true })
    await page.getByRole('button', { name: /^Open / }).click()
    await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
  })
}
