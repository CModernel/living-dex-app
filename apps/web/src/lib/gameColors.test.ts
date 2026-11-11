import { GAMES } from '@living-dex/business-logic'
import { expect, test } from 'vitest'
import { GAME_STYLE, gameStyle } from './gameColors'

test('every game has a color and a generation (add one here when a game is added)', () => {
  for (const game of GAMES) {
    expect(GAME_STYLE[game.id], `missing style for ${game.id}`).toBeDefined()
    expect(GAME_STYLE[game.id].color).toMatch(/^#[0-9A-F]{6}$/i)
    expect(GAME_STYLE[game.id].generation).toBeGreaterThanOrEqual(1)
  }
})

test('an unknown game falls back to a neutral style instead of throwing', () => {
  expect(gameStyle('future-game').generation).toBe(0)
})
