import { describe, expect, it } from 'vitest'
import { decodeCustom, encodeCustom } from './custom'
import type { Status } from './judge'
import { SHARE_URL, buildKakaoCard, buildShareText } from './share'

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

  it('카톡 카드: 제목은 결과 문구, 설명은 점수 줄 + 격자', () => {
    const base = { hard: false, streak: null, rows, highContrast: false, showLink: true }
    expect(buildKakaoCard({ ...base, number: 12, attempts: 2, streak: 5 })).toEqual({
      title: '오늘의 단어 성공! 🎉',
      description: '글딱지 12 2/6 🔥5\n⬜️🟨⬜️⬜️🟩⬜️\n🟩🟩🟩🟩🟩🟩',
    })
    expect(buildKakaoCard({ ...base, number: 1, attempts: 1, rows: [rows[1]] }).title).toBe(
      '오늘의 단어 한 번에 성공! 🎯',
    )
    expect(buildKakaoCard({ ...base, number: 1, attempts: 6 }).title).toBe('오늘의 단어 아슬아슬 성공! 😅')
    expect(buildKakaoCard({ ...base, number: 1, attempts: null }).title).toBe('오늘의 단어 실패… 내일 다시! 😢')
    expect(buildKakaoCard({ ...base, number: null, attempts: 3, creator: '민수' })).toEqual({
      title: '민수의 문제 성공! 🎉',
      description: '글딱지 3/6\n⬜️🟨⬜️⬜️🟩⬜️\n🟩🟩🟩🟩🟩🟩',
    })
  })

  it('문제 코드는 정답 자모와 제작자를 왕복한다', () => {
    const answer = ['ㅇ', 'ㅣ', 'ㅂ', 'ㅅ', 'ㅜ', 'ㄹ']
    const code = encodeCustom(answer, '고구마')
    expect(code).not.toContain('ㅇ')
    expect(decodeCustom(code)).toEqual({ answer, creator: '고구마' })
    expect(decodeCustom('nope')).toBeNull()
  })
})
