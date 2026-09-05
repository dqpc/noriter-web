import type { ComponentType } from 'react'

export type GameOptions = Record<string, string | number | boolean>

export interface GameResult {
  won: boolean
  elapsedMs: number
}

export type GameMode = 'VERSUS' | 'COOP'

export interface CoopProps {
  view: Record<string, unknown>
  receivedAt: number
  myRole: string | null
  onInput: (input: Record<string, unknown>) => void
}

export interface GameHost {
  onScore: (score: number) => void
  onGameOver: (score: number, result: GameResult) => void
}

export interface GameDefinition {
  id: string
  name: string
  description: string
  Icon: ComponentType<{ size?: number }>
  Component: ComponentType<{ host: GameHost; options?: GameOptions }>
  modes: GameMode[]
  Coop?: ComponentType<CoopProps>
}
