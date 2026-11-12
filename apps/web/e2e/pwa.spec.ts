import { expect, test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { dataset, startList } from './fixture'

// 3.39 / 3.45: runs against the production build (project "pwa"), where the service worker is registered.
test.beforeAll(() => writeFileSync('dist-e2e/test-dataset.json', JSON.stringify(dataset)))

test('manifest, icons and a build-stamped service worker are served', async ({ request, baseURL }) => {
  const manifest = await (await request.get(`${baseURL}manifest.webmanifest`)).json()
  expect(manifest).toMatchObject({ display: 'standalone', short_name: 'Living Dex' })
  for (const icon of manifest.icons as { src: string }[]) expect((await request.get(`${baseURL}${icon.src}`)).ok()).toBe(true)
  const sw = await (await request.get(`${baseURL}sw.js`)).text()
  expect(sw).not.toContain('__BUILD_ID__')
})

test('after one visit the app, its data and the saved list work offline', async ({ page, context }) => {
  await page.route(/\.(png|gif|webp)(\?.*)?$/, (route) => route.abort())
  await page.goto('./')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload() // now controlled by the worker: the dataset goes through it and gets cached
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await startList(page)
  await page.getByRole('checkbox', { name: 'Mark Mon 3 as owned', exact: true }).check()
  // The dataset is cached by now (stale-while-revalidate); go offline and reload.
  await page.waitForTimeout(500)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Mark Mon 3 as owned', exact: true })).toBeChecked()
  await expect(page.getByText('Failed to load dataset')).toHaveCount(0)
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
})
