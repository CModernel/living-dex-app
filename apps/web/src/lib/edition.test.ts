import { afterEach, expect, test, vi } from 'vitest'

async function load(editionValue?: string) {
  vi.resetModules()
  if (editionValue !== undefined) vi.stubEnv('VITE_EDITION', editionValue)
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key')
  return { edition: await import('./edition'), cloud: await import('./cloud') }
}

afterEach(() => vi.unstubAllEnvs())

test('hosted is the default and cloud sync is available when configured', async () => {
  const { edition, cloud } = await load()
  expect(edition.edition).toBe('hosted')
  expect(cloud.cloudConfigured).toBe(true)
})

test('the community edition has no cloud even if the Supabase variables are set', async () => {
  const { edition, cloud } = await load('community')
  expect(edition.edition).toBe('community')
  expect(edition.capabilities.cloudSync).toBe(false)
  expect(cloud.cloudConfigured).toBe(false)
  await expect(cloud.getClient()).rejects.toThrow('not configured')
})

test('an unknown edition value falls back to hosted', async () => {
  const { edition } = await load('enterprise')
  expect(edition.edition).toBe('hosted')
})
