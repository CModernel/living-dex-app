import { GAMES } from '@living-dex/business-logic'
import { expect, test } from 'vitest'
import { badgeTextColor, GAME_CODE, GAME_STYLE, gameCode, gameStyle } from './gameColors'

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

test('every game has a short, unique badge code (3.38)', () => {
  const codes = GAMES.map((game) => GAME_CODE[game.id])
  for (const [i, code] of codes.entries()) expect(code, `missing code for ${GAMES[i].id}`).toMatch(/^[A-Za-z0-9]{1,2}$/)
  expect(new Set(codes).size).toBe(GAMES.length)
  expect(gameCode('blue')).toBe('B')
  expect(gameCode('yellow')).toBe('Ye')
  expect(gameCode('future-game')).toBe('FU')
})

test('badge text is dark on light colors and white on dark ones', () => {
  expect(badgeTextColor('#F2C417')).toBe('#111111')
  expect(badgeTextColor('#2F5BD6')).toBe('#FFFFFF')
})
