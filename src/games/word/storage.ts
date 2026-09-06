import type { Status } from './judge'

const PREFIX = 'noriter:word:'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* 저장 실패는 무시 */
  }
}

export interface Answer {
  jamo: string
  word: string
  meaning: string | null
}

export interface Progress {
  number: number
  rows: string[][]
  statuses: Status[][]
  hard: boolean
  finished: boolean
  won: boolean
  answer: Answer | null
}

export interface Stats {
  played: number
  won: number
  currentStreak: number
  maxStreak: number
  distribution: number[]
  /** 마지막으로 끝낸 문제 번호. 연속 정답 계산용 */
  lastNumber: number | null
}

export interface Settings {
  hard: boolean
  highContrast: boolean
  showLink: boolean
  showStreak: boolean
}

export const DEFAULT_SETTINGS: Settings = { hard: false, highContrast: false, showLink: true, showStreak: true }

export function loadProgress(number: number): Progress | null {
  const p = read<Progress>(`progress:${number}`)
  return p && p.number === number ? p : null
}

export function saveProgress(p: Progress): void {
  write(`progress:${p.number}`, p)
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>('settings') ?? {}) }
}

export function saveSettings(s: Settings): void {
  write('settings', s)
}

export function loadGuestStats(): Stats {
  return (
    read<Stats>('stats') ?? {
      played: 0,
      won: 0,
      currentStreak: 0,
      maxStreak: 0,
      distribution: [0, 0, 0, 0, 0, 0],
      lastNumber: null,
    }
  )
}

/** 게스트 통계 갱신. 어제 문제를 맞혔어야 연속으로 친다 */
export function recordGuestResult(number: number, attempts: number | null): Stats {
  const s = loadGuestStats()
  if (s.lastNumber === number) return s
  s.played += 1
  if (attempts !== null) {
    s.won += 1
    s.distribution[attempts - 1] += 1
    s.currentStreak = s.lastNumber === number - 1 ? s.currentStreak + 1 : 1
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak)
  } else {
    s.currentStreak = 0
  }
  s.lastNumber = number
  write('stats', s)
  return s
}

export function hasSeenHelp(): boolean {
  return read<boolean>('seen-help') === true
}

export function markHelpSeen(): void {
  write('seen-help', true)
}
