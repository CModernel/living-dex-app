import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { mockNetwork, startList } from './fixture'

// TODO 3.20 / 3.19: end-to-end "brand-new user" journeys, starting from an empty browser.

test.beforeEach(async ({ page }) => {
  await mockNetwork(page)
})

async function freshStart(page: Page, query = '') {
  await page.goto(`./${query}`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('region', { name: 'Get started' })).toBeVisible()
}

test('new user: tier guide in the wizard, plan to grow, switch tier, earn medals', async ({ page }) => {
  await freshStart(page)
  await expect(page.getByRole('region', { name: 'Welcome' })).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()

  const wizard = page.getByRole('dialog', { name: 'Start a new list' })
  await expect(wizard.getByText('Only fully evolved Pokémon, one of each.')).toBeVisible()
  await expect(wizard.getByText('13 Pokémon · 1 box').first()).toBeVisible()
  await wizard.getByLabel('New list name').fill('Fresh run')
  await wizard.getByText('Final Form', { exact: true }).click()
  await wizard.getByRole('button', { name: 'Next' }).click()
  await wizard.getByText("I'll grow it later").click()
  await wizard.getByRole('button', { name: 'Create' }).click()

  // Final Form: only fully evolved entries (mon-2, mon-5, ...). 4 of 13 earns the 25% medal.
  await expect(page.getByText('Mon 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Mon 1', { exact: true })).toHaveCount(0)
  for (const i of [2, 5, 8, 11]) await page.getByRole('checkbox', { name: `Mark Mon ${i} as owned`, exact: true }).check()

  // Living Form fits the box plan: it switches without asking.
  await page.getByLabel('Tier').selectOption('living-form')
  await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Trophies' }).getByRole('img').first()).toBeVisible()

  await page.getByRole('button', { name: 'Explain the collection goals' }).click()
  await expect(page.getByRole('dialog', { name: 'What are tiers?' })).toBeVisible()
  await page.screenshot({ path: 'e2e/results/tier-guide.png' })
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
  await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
  await debug.getByRole('button', { name: 'Mark all' }).click()
  await expect(debug.getByText('40 owned')).toBeVisible()
  const trophies = page.getByRole('region', { name: 'Trophies' })
  await expect(trophies.locator('li[data-earned="true"]').first()).toBeVisible()
  await debug.getByRole('button', { name: 'Clear owned' }).click()
  await expect(debug.getByText('0 owned')).toBeVisible()
  await debug.getByRole('button', { name: 'Reset all data' }).click()
  await expect(page.getByRole('region', { name: 'Get started' })).toBeVisible()
})
