import { expect, test } from '@playwright/test'
import { mockNetwork, startList, openSidebar } from './fixture'

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
  await openSidebar(page)
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
  await picker.getByTitle('Red', { exact: true }).click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: 'e2e/results/game-picker.png' })
  await page.keyboard.press('Escape')
  await expect(button).toContainText('1')
  await expect(page.getByRole('checkbox', { name: 'Mark Mon 1 as owned' })).toBeChecked()
})

test('"+" opens the tier picker and the new list becomes active', async ({ page }) => {
  await openSidebar(page)
  await page.getByRole('button', { name: 'Create new list' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create new list' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Final Form', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Plan your boxes' })).toBeVisible()
})

test('the disclaimer is visible in the footer and in Settings, and the page does not overflow', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toContainText('not affiliated with')
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('region', { name: 'About' })).toContainText('independent, unofficial fan-made tool')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: 'e2e/results/settings.png' })
})

// 3.26 / 3.32: the search box and the Owned bar stay visible while scrolling, with the table header right below.
test('search and the Owned bar stay visible while scrolling and the search filters rows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 })
  await page.evaluate(() => window.scrollTo(0, 0))
  const search = page.getByRole('searchbox', { name: 'Search Pokémon' })
  const bar = page.getByRole('progressbar', { name: 'Owned progress' })
  await page.mouse.wheel(0, 1500)
  await expect(search).toBeInViewport()
  await expect(bar).toBeInViewport()
  const searchBottom = (await search.boundingBox())!.y + (await search.boundingBox())!.height
  const header = page.getByRole('columnheader').first()
  expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(searchBottom - 1)
  await page.screenshot({ path: 'e2e/results/sticky-stack.png' })
  await search.fill('Mon 12')
  await expect(page.getByText('Mon 12', { exact: true })).toBeVisible()
  await expect(page.getByText('Mon 13', { exact: true })).toHaveCount(0)
})

// 3.31: desktop folds the sidebar to a rail; phone shows an accordion header, closed by default.
test('the sidebar folds to a rail on desktop and is an accordion on a phone', async ({ page }, testInfo) => {
  const list = page.getByRole('button', { name: 'Actions for My Living Dex' })
  if (testInfo.project.name === 'mobile') {
    await expect(list).toBeHidden()
    await page.getByRole('button', { name: /^Lists · My Living Dex/ }).click()
    await expect(list).toBeVisible()
    return
  }
  await expect(list).toBeVisible()
  // 3.61: "+" and collapse sit on one row, same size.
  const plus = await page.getByRole('button', { name: 'Create new list' }).boundingBox()
  const fold = await page.getByRole('button', { name: 'Collapse sidebar' }).boundingBox()
  expect(plus!.y).toBeCloseTo(fold!.y, 0)
  expect(plus!.height).toBeCloseTo(fold!.height, 0)
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(list).toBeHidden()
  await expect(page.getByRole('button', { name: 'Switch to My Living Dex' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible() // remembered
  await page.screenshot({ path: 'e2e/results/sidebar-rail.png' })
})

// 3.57: the theme switch cross-fades one page snapshot (View Transitions) instead of transitioning every element.
test('toggling the theme runs a view transition and ends dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('./')
  await page.evaluate(() => {
    const original = document.startViewTransition?.bind(document)
    ;(window as unknown as { transitions: number }).transitions = 0
    if (original) document.startViewTransition = (cb?: () => void) => {
      ;(window as unknown as { transitions: number }).transitions++
      return original(cb as never)
    }
  })
  await page.getByRole('button', { name: /dark|light/i }).first().click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.evaluate(() => (window as unknown as { transitions: number }).transitions)).toBe(1)
  expect(await page.evaluate(() => document.querySelectorAll('html.theme-fade').length)).toBe(0)
})
