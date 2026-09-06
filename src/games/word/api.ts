import { call } from '../../lib/auth'
import type { Status } from './judge'
import type { Answer } from './storage'

export interface Today {
  number: number
  date: string
  tries: number
  length: number
  resetAt: string
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
  call<{ statuses: Status[] }>('/api/games/word/guesses', { method: 'POST', body: JSON.stringify({ number, jamo }) })

export const submitResult = (number: number, attempts: number | null, hard: boolean) =>
  call<ResultResponse>('/api/games/word/results', {
    method: 'POST',
    body: JSON.stringify({ number, attempts, hard }),
  })

export const fetchWordStats = () => call<ServerStats>('/api/games/word/stats')

export const checkWord = (jamo: string) =>
  call<{ valid: boolean }>(`/api/games/word/dictionary/${encodeURIComponent(jamo)}`).then((r) => r.valid)
