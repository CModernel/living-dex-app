import { expect, test } from '@playwright/test'
import { mockNetwork, startList } from './fixture'

test.beforeEach(async ({ page }) => {
  await mockNetwork(page)
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await startList(page)
})

test('header shows the logo and the page has no horizontal scroll', async ({ page }) => {
  await expect(page.getByText('COLLECTION ORGANIZER')).toBeVisible()
  await expect(page.getByRole('banner').getByText('Living', { exact: false }).first()).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: 'e2e/results/home.png' })
})

test('only Dex is shown by default, right after the sprite; Types and Box/Slot are hidden', async ({ page }) => {
  const headers = (await page.getByRole('columnheader').allTextContents()).map((t) => t.replace(/[⠿▲▼]/g, '').trim())
  expect(headers).toEqual(['Sprite', 'Dex', 'Name', 'Owned'])
  await page.getByText('Columns', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'Types' }).check()
  await expect(page.getByText('grass').first()).toBeVisible()
  await page.getByRole('button', { name: 'Reset columns' }).click()
  await expect(page.getByText('grass')).toHaveCount(0)
})

test('trophy case opens over a blurred backdrop, shows tier rows and closes with Escape', async ({ page }) => {
  for (let i = 1; i <= 12; i++) await page.getByRole('checkbox', { name: `Mark Mon ${i} as owned`, exact: true }).check()
  const panel = page.getByRole('region', { name: 'Trophies' })
  await expect(panel.getByRole('img').first()).toBeVisible()
  await panel.getByRole('button', { name: 'View all' }).click()
  const dialog = page.getByRole('dialog', { name: 'Trophy case' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('region', { name: 'Living Form', exact: true })).toBeVisible()
  const blur = await dialog.evaluate((el) => getComputedStyle(el.parentElement!).backdropFilter)
  expect(blur).toContain('blur')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'e2e/results/trophy-case.png' })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('the obtained-from button opens a picker of colored game chips and tags a game', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Obtained from games for Mon 1', exact: true })
  // Scroll first and let the (async) scroll event land: the picker closes on scroll, by design.
  await button.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  await button.click()
  const picker = page.getByRole('dialog', { name: /Obtained from/ })
  await expect(picker.getByText('Gen 1')).toBeVisible()
  await picker.locator('label', { hasText: 'Red' }).click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: 'e2e/results/game-picker.png' })
  await page.keyboard.press('Escape')
  await expect(button).toContainText('1')
  await expect(page.getByRole('checkbox', { name: 'Mark Mon 1 as owned' })).toBeChecked()
})

test('creating a list opens the start wizard and the new list becomes active', async ({ page }) => {
  await page.getByRole('button', { name: 'Create new list' }).click()
  const wizard = page.getByRole('dialog', { name: 'Start a new list' })
  await expect(wizard).toBeVisible()
  await wizard.getByLabel('New list name').fill('Shinies')
  await wizard.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('Shinies')).toBeVisible()
  await expect(wizard).toHaveCount(0)
})

test('the disclaimer is visible in the footer and in Settings, and the page does not overflow', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toContainText('not affiliated with')
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('region', { name: 'About' })).toContainText('independent, unofficial fan-made tool')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: 'e2e/results/settings.png' })
})
