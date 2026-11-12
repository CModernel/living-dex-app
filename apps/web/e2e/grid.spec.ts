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
