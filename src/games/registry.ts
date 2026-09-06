import { game2048 } from './2048'
import { stairs } from './stairs'
import { yut } from './yut'
import { word } from './word'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [game2048, stairs, yut, word]

export function findGame(id: string | undefined): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
