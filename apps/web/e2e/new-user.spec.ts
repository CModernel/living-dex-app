import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { mockNetwork, startList, openSidebar } from './fixture'

// TODO 3.20 / 3.19: end-to-end "brand-new user" journeys, starting from an empty browser.

test.beforeEach(async ({ page }) => {
  await mockNetwork(page)
})

async function freshStart(page: Page, query = '') {
  await page.goto(`./${query}`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  // 3.64: with no list the app lands on the dashboard; its button opens the tier picker.
  await page.getByRole('button', { name: 'Create your first list' }).click()
  await expect(page.getByRole('region', { name: 'Choose what to collect' })).toBeVisible()
}

for (const scheme of ['light', 'dark'] as const) {
  test(`new user (${scheme}): pick a tier, plan the boxes, own entries, advance inside the plan`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await freshStart(page)
    const picker = page.getByRole('region', { name: 'Choose what to collect' })
    await expect(picker.getByText('Quickest goal')).toBeVisible()
    await expect(picker.getByText('13', { exact: true }).first()).toBeVisible()
    await page.screenshot({ path: `e2e/results/tier-picker-${scheme}.png`, fullPage: true })
    await picker.getByRole('button', { name: 'Final Form', exact: true }).click()

    // Final Form: only fully evolved entries (mon-2, mon-5, ...). Box/Slot locked until the plan is decided.
    await expect(page.getByText('Mon 2', { exact: true })).toBeVisible()
    await expect(page.getByText('Mon 1', { exact: true })).toHaveCount(0)
    const banner = page.getByRole('region', { name: 'Plan your boxes' })
    await expect(banner).toContainText('Box and Slot stay hidden')
    await banner.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `e2e/results/plan-banner-${scheme}.png` })
    await banner.getByRole('button', { name: /Plan for bigger goal/ }).click()
    const goals = page.getByRole('dialog', { name: 'Choose a bigger goal' })
    await expect(goals.getByRole('button')).toHaveCount(3) // 3 bigger goals
    await goals.getByRole('button', { name: /Living Form Full/ }).click()
    await expect(banner).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: 'Plan' })).toHaveValue('living-form-full')

    for (const i of [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38]) {
      await page.getByRole('checkbox', { name: `Mark Mon ${i} as owned`, exact: true }).check()
    }
    await expect(page.getByText('Final Form complete!')).toBeVisible()
    await page.getByRole('button', { name: 'Advance to Living Form', exact: true }).click()
    await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Plan your boxes' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Mark Mon 2 as owned', exact: true })).toBeChecked()
    await openSidebar(page)
    await expect(page.getByRole('region', { name: 'Trophies' }).getByRole('img').first()).toBeVisible()
  })
}

test('the tiers guide explains the differences', async ({ page }) => {
  await freshStart(page)
  await page.getByRole('link', { name: "What's the difference?" }).click()
  await expect(page.getByRole('heading', { name: "What's the difference between tiers?" })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Which tier contains which' })).toBeVisible()
  const outer = page.getByRole('button', { name: 'Living Form Full circle' })
  const box = (await outer.boundingBox())!
  // Inner circles cover the centre: tap the outer ring, where only Living Form Full is.
  await outer.click({ position: { x: 8, y: box.height / 2 } })
  await expect(page.getByRole('region', { name: 'Selected tier' })).toContainText('Absolutely everything.')
  await page.screenshot({ path: 'e2e/results/tiers-page.png', fullPage: true })
})

test('backup round trip: export, reset, import', async ({ page }) => {
  await freshStart(page, '?debug')
  await startList(page)
  for (let i = 1; i <= 5; i++) await page.getByRole('checkbox', { name: `Mark Mon ${i} as owned`, exact: true }).check()

  await page.getByRole('link', { name: 'Settings' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export/i }).click(),
  ])
  const file = (await download.path())!
  const backup = JSON.parse(await readFile(file, 'utf8'))
  expect(backup.app).toBe('living-dex')
  expect(backup.version).toBe(1)
  const lists = Object.values<{ ownedIds: string[]; tier?: string }>(backup.state.lists)
  expect(lists.flatMap((l) => l.ownedIds)).toHaveLength(5)
  expect(lists[0].tier).toBe('living-form')

  const debug = page.getByRole('region', { name: 'Debug' })
  await debug.getByRole('button', { name: 'Reset all data' }).click()
  await expect(debug.getByText(/0 list\(s\), 0 owned/)).toBeVisible()

  await page.getByLabel('Import file').setInputFiles(file)
  await expect(page.getByRole('status')).toContainText('Imported 1 collection')
  await expect(debug.getByText(/1 list\(s\)/)).toBeVisible()
})

test('debug panel: hidden without ?debug; quick start, mark all, clear and reset work', async ({ page }) => {
  await freshStart(page)
  await expect(page.getByRole('region', { name: 'Debug' })).toHaveCount(0)

  await freshStart(page, '?debug')
  const debug = page.getByRole('region', { name: 'Debug' })
  await expect(debug).toBeVisible()
  await debug.getByRole('button', { name: 'Quick start' }).click()
  await page.getByRole('link', { name: 'Home' }).click() // no list = the dashboard; the list lives on Home
  await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
  await debug.getByRole('button', { name: 'Mark all' }).click()
  await expect(debug.getByText('40 owned')).toBeVisible()
  await openSidebar(page)
  const trophies = page.getByRole('region', { name: 'Trophies' })
  await expect(trophies.locator('li[data-earned="true"]').first()).toBeVisible()
  await debug.getByRole('button', { name: 'Clear owned' }).click()
  await expect(debug.getByText('0 owned')).toBeVisible()
  await debug.getByRole('button', { name: 'Reset all data' }).click()
  await expect(page.getByRole('button', { name: 'Create your first list' })).toBeVisible()
})
