import { describe, expect, it } from 'vitest'
import { JAMO_KEYS, decompose, jamoToQwerty, keyToJamo, qwertyToJamo, splitJamo } from './jamo'

describe('jamo', () => {
  it('키보드는 두벌식 기본 자모 24개', () => {
    expect(JAMO_KEYS).toHaveLength(24)
    expect(new Set(JAMO_KEYS).size).toBe(24)
  })

  it('음절을 초성·중성·종성으로 푼다', () => {
    expect(decompose('입술')).toEqual(['ㅇ', 'ㅣ', 'ㅂ', 'ㅅ', 'ㅜ', 'ㄹ'])
    expect(decompose('마이크')).toEqual(['ㅁ', 'ㅏ', 'ㅇ', 'ㅣ', 'ㅋ', 'ㅡ'])
  })

  it('복합모음·쌍자음·겹받침은 더 작은 자모로 푼다', () => {
    expect(decompose('뽀뽀')).toEqual(['ㅂ', 'ㅂ', 'ㅗ', 'ㅂ', 'ㅂ', 'ㅗ'])
    expect(decompose('원고')).toEqual(['ㅇ', 'ㅜ', 'ㅓ', 'ㄴ', 'ㄱ', 'ㅗ'])
    expect(decompose('왜')).toEqual(['ㅇ', 'ㅗ', 'ㅏ', 'ㅣ'])
    expect(decompose('삯')).toEqual(['ㅅ', 'ㅏ', 'ㄱ', 'ㅅ'])
    expect(splitJamo('ㅔ')).toEqual(['ㅓ', 'ㅣ'])
  })

  it('한글이 아닌 글자는 버린다', () => {
    expect(decompose('a1 ')).toEqual([])
  })

  it('영문 자판과 한글 자모 입력을 모두 받는다', () => {
    expect(keyToJamo('q')).toEqual(['ㅂ'])
    expect(keyToJamo('K')).toEqual(['ㅏ'])
    expect(keyToJamo('ㅐ')).toEqual(['ㅏ', 'ㅣ'])
    expect(keyToJamo('Enter')).toEqual([])
    expect(keyToJamo('1')).toEqual([])
  })

  it('자모와 영문 키를 서로 바꾼다', () => {
    const jamo = decompose('입술')
    expect(qwertyToJamo(jamoToQwerty(jamo))).toEqual(jamo)
  })
})
