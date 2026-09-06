import { MAX_TRIES } from './jamo'
import type { Status } from './judge'

export interface ServerGuess {
  jamo: string
  statuses: Status[]
}

export interface Restored {
  rows: string[][]
  statuses: Status[][]
  finished: boolean
  won: boolean
}

/** 계정 사용자는 서버에 저장된 추측이 정본이다. 로컬 저장과 다르면 서버를 따른다 */
export function fromServerGuesses(guesses: ServerGuess[]): Restored {
  const rows = guesses.map((g) => Array.from(g.jamo))
  const statuses = guesses.map((g) => g.statuses)
  const last = statuses[statuses.length - 1]
  const won = last !== undefined && last.every((s) => s === 'correct')
  return { rows, statuses, finished: won || rows.length >= MAX_TRIES, won }
}
