import { call } from '../../lib/auth'
import type { Status } from './judge'
import type { ServerGuess } from './restore'
import type { Answer } from './storage'

export interface Today {
  number: number
  date: string
  tries: number
  length: number
  resetAt: string
  /** 계정이면 서버에 저장된 오늘 추측(복원용), 게스트는 null */
  guesses: ServerGuess[] | null
}

export interface ServerStats {
  played: number
  won: number
  winRate: number
  currentStreak: number
  maxStreak: number
  distribution: number[]
}

export interface ResultResponse {
  answer: Answer
  stats: ServerStats | null
}

export const fetchToday = () => call<Today>('/api/games/word/today')

export const submitGuess = (number: number, jamo: string) =>
  call<{ statuses: Status[]; seq: number | null }>('/api/games/word/guesses', {
    method: 'POST',
    body: JSON.stringify({ number, jamo }),
  })

/** 계정이면 서버가 저장된 추측으로 시도 횟수를 계산하고 attempts 는 무시한다 */
export const submitResult = (number: number, attempts: number | null, hard: boolean) =>
  call<ResultResponse>('/api/games/word/results', {
    method: 'POST',
    body: JSON.stringify({ number, attempts, hard }),
  })

export const fetchWordStats = () => call<ServerStats>('/api/games/word/stats')

export const checkWord = (jamo: string) =>
  call<{ valid: boolean }>(`/api/games/word/dictionary/${encodeURIComponent(jamo)}`).then((r) => r.valid)
