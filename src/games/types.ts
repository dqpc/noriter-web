import type { ComponentType } from 'react'

export type GameOptions = Record<string, string | number | boolean>

export interface GameResult {
  won: boolean
  elapsedMs: number
  /** seed 로 시작한 판의 입력 로그. 서버가 같은 seed 로 재생해 점수를 검증한다 */
  moves?: string
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
  /** 혼자 하기 전용. 방·최고 점수 UI 를 숨긴다 */
  solo?: boolean
  Turn?: ComponentType<TurnProps>
  /** 판이 오기 전(카운트다운)에 보여줄 빈 판 */
  idleView?: (playerIds: string[]) => Record<string, unknown>
}
