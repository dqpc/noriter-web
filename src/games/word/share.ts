import type { Status } from './judge'

export const SHARE_URL = 'https://noriter-web.asgd56.workers.dev/games/word'

const EMOJI: Record<'normal' | 'contrast', Record<Status, string>> = {
  normal: { correct: '🟩', present: '🟨', absent: '⬜️' },
  contrast: { correct: '🟧', present: '🟦', absent: '⬜️' },
}

export interface ShareInput {
  /** 글딱지 번호. 문제 만들기면 null */
  number: number | null
  /** 맞힌 도전 횟수. 실패면 null */
  attempts: number | null
  hard: boolean
  /** 연속 정답 표기를 켰을 때만 값 */
  streak: number | null
  rows: readonly (readonly Status[])[]
  highContrast: boolean
  showLink: boolean
  creator?: string
}

export function buildShareText(input: ShareInput): string {
  const score = `${input.attempts ?? 'X'}/6${input.hard ? '*' : ''}`
  const head =
    input.number === null
      ? `글딱지 ${score}\n${input.creator ?? ''}의 놀이`
      : `글딱지 ${input.number} ${score}${input.streak !== null ? ` 🔥${input.streak}` : ''}`
  const palette = EMOJI[input.highContrast ? 'contrast' : 'normal']
  const grid = input.rows.map((row) => row.map((s) => palette[s]).join('')).join('\n')
  const parts = [head, grid]
  if (input.showLink) parts.push(SHARE_URL)
  return parts.join('\n')
}
