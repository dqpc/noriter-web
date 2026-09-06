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

function scoreOf(input: ShareInput): string {
  return `${input.attempts ?? 'X'}/6${input.hard ? '*' : ''}`
}

function headOf(input: ShareInput): string {
  const score = scoreOf(input)
  return input.number === null
    ? `글딱지 ${score}\n${input.creator ?? ''}의 놀이`
    : `글딱지 ${input.number} ${score}${input.streak !== null ? ` 🔥${input.streak}` : ''}`
}

function gridOf(input: ShareInput): string {
  const palette = EMOJI[input.highContrast ? 'contrast' : 'normal']
  return input.rows.map((row) => row.map((s) => palette[s]).join('')).join('\n')
}

export function buildShareText(input: ShareInput): string {
  const parts = [headOf(input), gridOf(input)]
  if (input.showLink) parts.push(SHARE_URL)
  return parts.join('\n')
}

/** 카톡 카드는 제목 한 줄이 먼저 보이므로 결과를 말로 풀고, 점수·격자는 설명으로 */
export function buildKakaoCard(input: ShareInput): { title: string; description: string } {
  const what = input.number === null ? `${input.creator ?? ''}의 문제` : '오늘의 단어'
  let title: string
  if (input.attempts === null) title = `${what} 실패… 내일 다시! 😢`
  else if (input.attempts === 1) title = `${what} 한 번에 성공! 🎯`
  else if (input.attempts === 6) title = `${what} 아슬아슬 성공! 😅`
  else title = `${what} 성공! 🎉`
  const score = input.number === null ? `글딱지 ${scoreOf(input)}` : headOf(input)
  return { title, description: `${score}\n${gridOf(input)}` }
}
