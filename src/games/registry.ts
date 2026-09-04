import { game2048 } from './2048'
import type { GameDefinition } from './types'

export const GAMES: GameDefinition[] = [game2048]

export function findGame(id: string | undefined): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
