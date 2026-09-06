import { describe, expect, it } from 'vitest'
import { hardModeError, judge, keyStatuses } from './judge'

const A = (s: string) => s.split('')

describe('judge', () => {
  it('자리까지 맞으면 correct, 있지만 자리가 다르면 present', () => {
    expect(judge(A('ㅅㅏㄹㅇㅣㄴ'), A('ㅅㅏㅇㅇㅣㄴ'))).toEqual([
      'correct',
      'correct',
      'absent',
      'correct',
      'correct',
      'correct',
    ])
    expect(judge(A('ㅇㅣㅂㅅㅜㄹ'), A('ㅅㅜㄹㅇㅣㅂ'))).toEqual(Array(6).fill('present'))
  })

  it('중복 자모는 정답에 있는 개수만큼만 색을 준다', () => {
    // 정답에 ㅇ 하나: 첫 ㅇ 은 자리 맞음, 둘째 ㅇ 은 없음
    expect(judge(A('ㅇㅏㅇㅏㅁㅣ'), A('ㅇㅣㅂㅅㅜㄹ'))).toEqual([
      'correct',
      'absent',
      'absent',
      'absent',
      'absent',
      'present',
    ])
    // 정답에 ㅂ 둘(뽀뽀): 추측의 ㅂ 셋 중 둘만 present
    expect(judge(A('ㅂㅂㅂㅏㅏㅏ'), A('ㅂㅂㅗㅂㅂㅗ'))).toEqual([
      'correct',
      'correct',
      'present',
      'absent',
      'absent',
      'absent',
    ])
  })

  it('어렵게 풀기: 초록은 같은 자리, 노랑은 반드시 포함', () => {
    const prev = A('ㅍㅗㅎㅗㅣㄱ')
    const st = judge(prev, A('ㅍㅣㄹㄹㅡㅁ'))
    expect(st[0]).toBe('correct')
    expect(hardModeError(A('ㅅㅏㄹㅇㅣㄴ'), prev, st)).toBe("'ㅍ' 자모는 1번째에 꼭 쓰여야 합니다.")
    const prev2 = A('ㅅㅅㅏㅇㅜㅁ')
    const st2 = judge(prev2, A('ㅁㅏㅇㅣㅋㅡ'))
    expect(hardModeError(A('ㅍㅗㅎㅗㅣㄱ'), prev2, st2)).toBe("추측에 꼭 'ㅏ' 자모가 들어가야 합니다.")
    expect(hardModeError(A('ㅁㅏㅇㅣㅋㅡ'), prev2, st2)).toBeNull()
    expect(hardModeError(A('ㅁㅏㅇㅣㅋㅡ'), undefined, undefined)).toBeNull()
  })

  it('키보드 색은 자모별로 가장 좋은 판정', () => {
    const rows = [A('ㅇㅣㅂㅅㅜㄹ'), A('ㅅㅜㄹㅇㅣㅂ')]
    const map = keyStatuses(rows, [judge(rows[0], A('ㅅㅜㄹㅇㅣㅂ')), judge(rows[1], A('ㅅㅜㄹㅇㅣㅂ'))])
    expect(map.get('ㅅ')).toBe('correct')
    expect(map.get('ㅎ')).toBeUndefined()
  })
})
