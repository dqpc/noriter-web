import { game2048 } from './2048'
import { stairs } from './stairs'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [game2048, stairs]

export function findGame(id: string | undefined): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
