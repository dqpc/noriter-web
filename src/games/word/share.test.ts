import { describe, expect, it } from 'vitest'
import { decodeCustom, encodeCustom } from './custom'
import type { Status } from './judge'
import { SHARE_URL, buildShareText } from './share'

const rows: Status[][] = [
  ['absent', 'present', 'absent', 'absent', 'correct', 'absent'],
  ['correct', 'correct', 'correct', 'correct', 'correct', 'correct'],
]

describe('share', () => {
  it('꼬들 형식: 번호 점수 연속, 격자, 링크', () => {
    expect(
      buildShareText({ number: 12, attempts: 2, hard: true, streak: 5, rows, highContrast: false, showLink: true }),
    ).toBe(`글딱지 12 2/6* 🔥5\n⬜️🟨⬜️⬜️🟩⬜️\n🟩🟩🟩🟩🟩🟩\n${SHARE_URL}`)
  })

  it('실패는 X, 고대비는 주황·파랑, 링크 표기 끄기', () => {
    expect(
      buildShareText({
        number: 3,
        attempts: null,
        hard: false,
        streak: null,
        rows: [rows[0]],
        highContrast: true,
        showLink: false,
      }),
    ).toBe('글딱지 3 X/6\n⬜️🟦⬜️⬜️🟧⬜️')
  })

  it('문제 만들기 결과에는 번호 대신 제작자', () => {
    expect(
      buildShareText({
        number: null,
        attempts: 2,
        hard: false,
        streak: null,
        rows,
        highContrast: false,
        showLink: false,
        creator: '민수',
      }),
    ).toBe('글딱지 2/6\n민수의 놀이\n⬜️🟨⬜️⬜️🟩⬜️\n🟩🟩🟩🟩🟩🟩')
  })

  it('문제 코드는 정답 자모와 제작자를 왕복한다', () => {
    const answer = ['ㅇ', 'ㅣ', 'ㅂ', 'ㅅ', 'ㅜ', 'ㄹ']
    const code = encodeCustom(answer, '고구마')
    expect(code).not.toContain('ㅇ')
    expect(decodeCustom(code)).toEqual({ answer, creator: '고구마' })
    expect(decodeCustom('nope')).toBeNull()
  })
})
