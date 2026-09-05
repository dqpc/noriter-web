import type { ComponentType } from 'react'

export type GameOptions = Record<string, string | number | boolean>

export interface GameResult {
  won: boolean
  elapsedMs: number
}

export type GameStateSnapshot = Record<string, unknown>

export interface PreviewProps {
  state: GameStateSnapshot
  options?: GameOptions
  character?: string | null
}

export interface TurnPlayer {
  id: string
  nickname: string
  character: string | null
}

export interface TurnProps {
  view: Record<string, unknown>
  me: string | null
  players: TurnPlayer[]
  onAction: (action: Record<string, unknown>) => void
  /** 서버 시계 - 내 시계 (ms). 제한 시간 계산에 더한다 */
  clockOffset?: number
}

export interface GameHost {
  onScore: (score: number) => void
  onState?: (state: GameStateSnapshot) => void
  onGameOver: (score: number, result: GameResult) => void
}

export interface GameDefinition {
  id: string
  name: string
  description: string
  Icon: ComponentType<{ size?: number }>
  Component?: ComponentType<{ host: GameHost; options?: GameOptions }>
  Preview?: ComponentType<PreviewProps>
  turnBased?: boolean
  Turn?: ComponentType<TurnProps>
}
