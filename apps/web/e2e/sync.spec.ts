import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { mockNetwork, startList } from './fixture'

// 3.42: two devices (two browser contexts, separate storage) signed in to the same account, against a fake Supabase
// (REST routes answered from one in-memory table). Runs on the `sync` project, whose dev server has cloud env vars.

type Row = { user_id: string; list_id: string; data: unknown; deleted: boolean }
const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'ash@example.com', aud: 'authenticated', role: 'authenticated' }

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600 * 24
const accessToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, exp, role: 'authenticated', email: USER.email })}.sig`
const session = { access_token: accessToken, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user: USER }

async function device(context: BrowserContext, rows: Map<string, Row>): Promise<Page> {
  await context.addInitScript((s) => localStorage.setItem('sb-example-auth-token', JSON.stringify(s)), session)
  const page = await context.newPage()
  await mockNetwork(page)
  await page.route('https://example.supabase.co/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.pathname.endsWith('/rest/v1/user_state')) return route.fulfill({ json: [] })
    if (url.pathname.endsWith('/rest/v1/lists')) {
      if (req.method() === 'GET') return route.fulfill({ json: [...rows.values()] })
      for (const row of req.postDataJSON() as Row[]) rows.set(row.list_id, row)
      return route.fulfill({ status: 201, json: [] })
    }
    if (url.pathname.endsWith('/auth/v1/user')) return route.fulfill({ json: USER })
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('./')
  return page
}

const owned = (page: Page) => page.getByRole('checkbox', { name: 'Mark Mon 1 as owned' })

test('a list, a mark and an un-mark travel between two signed-in devices', async ({ browser }) => {
  const rows = new Map<string, Row>()
  const laptop = await device(await browser.newContext(), rows)
  await expect(laptop.getByRole('status', { name: 'Cloud sync: Synced' })).toBeVisible()
  await startList(laptop)
  await owned(laptop).check()
  await expect.poll(() => [...rows.values()].some((r) => JSON.stringify(r.data).includes('mon-1'))).toBe(true)

  // The phone starts with no list (dashboard); the laptop's list arrives with its mark.
  const phone = await device(await browser.newContext(), rows)
  await expect(phone.getByText('Living Form · 1 / 40')).toBeVisible()
  await phone.getByRole('button', { name: 'Open My Living Dex' }).click()
  await expect(owned(phone)).toBeChecked()

  await owned(phone).uncheck()
  await expect.poll(() => [...rows.values()].some((r) => JSON.stringify(r.data).includes('mon-1'))).toBe(false)
  await laptop.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(owned(laptop)).not.toBeChecked()
  await laptop.screenshot({ path: 'e2e/results/sync-indicator.png' })
})
