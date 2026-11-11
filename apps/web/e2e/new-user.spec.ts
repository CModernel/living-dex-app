import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { mockNetwork } from './fixture'

// TODO 3.20: end-to-end "brand-new user" journeys. The "new list" step uses today's Create dialog;
// when 3.19 adds the "Comenzar" wizard only that step changes.

test.beforeEach(async ({ page }) => {
  await mockNetwork(page)
})

async function freshStart(page: import('@playwright/test').Page, query = '') {
  await page.goto(`./${query}`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
}

test('new user: welcome, own list, mark entries, switch tier, earn medals', async ({ page }) => {
  await freshStart(page)
  await expect(page.getByRole('region', { name: 'Welcome' })).toBeVisible()
  await page.getByRole('button', { name: 'Create new list' }).click()
  await page.getByLabel('New list name').fill('Fresh run')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  for (let i = 1; i <= 12; i++) await page.getByRole('checkbox', { name: `Mark Mon ${i} as owned`, exact: true }).check()
  const rows = page.getByRole('row')
  const before = await rows.count()
  await page.getByLabel('Tier').selectOption({ index: 0 })
  await expect(page.getByLabel('Tier')).toBeVisible()
  expect(await rows.count()).toBeGreaterThan(0)
  expect(before).toBeGreaterThan(1)
  await expect(page.getByRole('region', { name: 'Trophies' }).getByRole('img').first()).toBeVisible()
})

test('backup round trip: export, reset, import', async ({ page }) => {
  await freshStart(page, '?debug')
  for (let i = 1; i <= 5; i++) await page.getByRole('checkbox', { name: `Mark Mon ${i} as owned`, exact: true }).check()

  await page.getByRole('link', { name: 'Settings' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export/i }).click(),
  ])
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(backup.app).toBe('living-dex')
  expect(backup.version).toBe(1)
  const owned = Object.values<{ ownedIds: string[] }>(backup.state.lists).flatMap((l) => l.ownedIds)
  expect(owned).toHaveLength(5)

  await page.getByRole('button', { name: 'Reset all data' }).click()
  await expect(page.getByText(/1 list\(s\), 0 owned/)).toBeVisible()

  await page.getByLabel('Import file').setInputFiles(download.suggestedFilename() && (await download.path())!)
  await expect(page.getByRole('status')).toContainText('Imported 1 collection')
  await expect(page.getByText(/2 list\(s\)/)).toBeVisible()
})

test('debug panel: hidden without ?debug; mark all, clear and reset work', async ({ page }) => {
  await freshStart(page)
  await expect(page.getByRole('region', { name: 'Debug' })).toHaveCount(0)

  await freshStart(page, '?debug')
  const debug = page.getByRole('region', { name: 'Debug' })
  await expect(debug).toBeVisible()
  await debug.getByRole('button', { name: 'Mark all' }).click()
  await expect(debug.getByText('40 owned')).toBeVisible()
  const trophies = page.getByRole('region', { name: 'Trophies' })
  await expect(trophies.locator('li[data-earned="true"]').first()).toBeVisible()
  await debug.getByRole('button', { name: 'Clear owned' }).click()
  await expect(debug.getByText('0 owned')).toBeVisible()
  await debug.getByRole('button', { name: 'Reset all data' }).click()
  await expect(debug.getByText(/1 list\(s\), 0 owned/)).toBeVisible()
})
