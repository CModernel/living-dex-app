import { TIERS } from '@cmodernel/living-dex-tiers'

test('can import and use TIERS from living-dex-tiers package', () => {
  const tierNames = Object.keys(TIERS)
  expect(tierNames).toContain('living-form')
  expect(tierNames).toContain('living-lite')
  expect(tierNames).toContain('final-form-full')
  expect(tierNames).toContain('final-form')
  expect(tierNames).toHaveLength(4)
})
