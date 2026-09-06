import { describe, expect, it } from 'vitest'
import type { Status } from './judge'
import { fromServerGuesses } from './restore'

const miss: Status[] = ['absent', 'present', 'absent', 'absent', 'correct', 'absent']
const hit: Status[] = ['correct', 'correct', 'correct', 'correct', 'correct', 'correct']

describe('fromServerGuesses', () => {
  it('빈 목록이면 새 판', () => {
    expect(fromServerGuesses([])).toEqual({ rows: [], statuses: [], finished: false, won: false })
  })

  it('자모 문자열을 칸 배열로 풀고, 마지막이 전부 correct 면 성공', () => {
    const r = fromServerGuesses([
      { jamo: 'ㅇㅣㅂㅅㅜㄹ', statuses: miss },
      { jamo: 'ㅎㅏㄴㄱㅡㄹ', statuses: hit },
    ])
    expect(r.rows).toEqual([
      ['ㅇ', 'ㅣ', 'ㅂ', 'ㅅ', 'ㅜ', 'ㄹ'],
      ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ'],
    ])
    expect(r.finished).toBe(true)
    expect(r.won).toBe(true)
  })

  it('여섯 번 다 틀리면 실패로 끝, 다섯 번이면 진행 중', () => {
    const five = Array.from({ length: 5 }, () => ({ jamo: 'ㅇㅣㅂㅅㅜㄹ', statuses: miss }))
    expect(fromServerGuesses(five)).toMatchObject({ finished: false, won: false })
    expect(fromServerGuesses([...five, five[0]])).toMatchObject({ finished: true, won: false })
  })
})
