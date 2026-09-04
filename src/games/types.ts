import type { ComponentType } from 'react'

export interface GameResult {
  won: boolean
  elapsedMs: number
}

export interface GameHost {
  onScore: (score: number) => void
  onGameOver: (score: number, result: GameResult) => void
}

export interface GameDefinition {
  id: string
  name: string
  description: string
  Component: ComponentType<{ host: GameHost }>
}
