import type { ComponentType } from 'react'

export interface GameHost {
  onScore: (score: number) => void
  onGameOver: (score: number) => void
}

export interface GameDefinition {
  id: string
  name: string
  description: string
  Component: ComponentType<{ host: GameHost }>
}
