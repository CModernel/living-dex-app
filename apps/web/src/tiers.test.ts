import { test } from 'vitest'
import { strict as assert } from 'node:assert'
import { TIERS } from '@cmodernel/living-dex-tiers'

test('can import and use TIERS from living-dex-tiers package', () => {
  const tierNames = Object.keys(TIERS)
  assert.ok(tierNames.includes('living-form'))
  assert.ok(tierNames.includes('living-lite'))
  assert.ok(tierNames.includes('final-form-full'))
  assert.ok(tierNames.includes('final-form'))
  assert.equal(tierNames.length, 4)
})
