import { game2048 } from './2048'
import type { GameDefinition } from './types'

/** 새 게임을 추가할 때는 여기에만 등록하면 목록과 라우팅에 자동 반영된다. */
export const GAMES: GameDefinition[] = [game2048]

export function findGame(id: string | undefined): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
