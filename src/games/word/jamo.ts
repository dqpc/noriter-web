// 꼬들 규칙: 두벌식 기본 자모 24개만 쓰고, 복합모음·쌍자음·겹받침은 더 작은 자모로 푼다.
export const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
]

export const JAMO_KEYS: readonly string[] = KEYBOARD_ROWS.flat()
const JAMO_SET = new Set(JAMO_KEYS)

export const WORD_LENGTH = 6
export const MAX_TRIES = 6

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

const SPLIT: Record<string, string> = {
  ㅐ: 'ㅏㅣ',
  ㅒ: 'ㅑㅣ',
  ㅔ: 'ㅓㅣ',
  ㅖ: 'ㅕㅣ',
  ㅘ: 'ㅗㅏ',
  ㅙ: 'ㅗㅏㅣ',
  ㅚ: 'ㅗㅣ',
  ㅝ: 'ㅜㅓ',
  ㅞ: 'ㅜㅓㅣ',
  ㅟ: 'ㅜㅣ',
  ㅢ: 'ㅡㅣ',
  ㄲ: 'ㄱㄱ',
  ㄸ: 'ㄷㄷ',
  ㅃ: 'ㅂㅂ',
  ㅆ: 'ㅅㅅ',
  ㅉ: 'ㅈㅈ',
  ㄳ: 'ㄱㅅ',
  ㄵ: 'ㄴㅈ',
  ㄶ: 'ㄴㅎ',
  ㄺ: 'ㄹㄱ',
  ㄻ: 'ㄹㅁ',
  ㄼ: 'ㄹㅂ',
  ㄽ: 'ㄹㅅ',
  ㄾ: 'ㄹㅌ',
  ㄿ: 'ㄹㅍ',
  ㅀ: 'ㄹㅎ',
  ㅄ: 'ㅂㅅ',
}

export const QWERTY: Record<string, string> = {
  q: 'ㅂ',
  w: 'ㅈ',
  e: 'ㄷ',
  r: 'ㄱ',
  t: 'ㅅ',
  y: 'ㅛ',
  u: 'ㅕ',
  i: 'ㅑ',
  a: 'ㅁ',
  s: 'ㄴ',
  d: 'ㅇ',
  f: 'ㄹ',
  g: 'ㅎ',
  h: 'ㅗ',
  j: 'ㅓ',
  k: 'ㅏ',
  l: 'ㅣ',
  z: 'ㅋ',
  x: 'ㅌ',
  c: 'ㅊ',
  v: 'ㅍ',
  b: 'ㅠ',
  n: 'ㅜ',
  m: 'ㅡ',
}

export function isBasicJamo(ch: string): boolean {
  return JAMO_SET.has(ch)
}

/** 자모 하나(복합 포함)를 기본 자모들로 푼다. 기본 자모가 아니면 빈 배열 */
export function splitJamo(ch: string): string[] {
  if (JAMO_SET.has(ch)) return [ch]
  const split = SPLIT[ch]
  return split ? split.split('') : []
}

/** 한글 문자열(음절·자모 섞임)을 기본 자모 배열로 푼다. 한글이 아닌 글자는 버린다 */
export function decompose(text: string): string[] {
  const out: string[] = []
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00
    if (code >= 0 && code < 11172) {
      const cho = Math.floor(code / 588)
      const jung = Math.floor((code % 588) / 28)
      const jong = code % 28
      out.push(...splitJamo(CHO[cho]), ...splitJamo(JUNG[jung]))
      if (jong > 0) out.push(...splitJamo(JONG[jong]))
    } else {
      out.push(...splitJamo(ch))
    }
  }
  return out
}

/** 물리 키보드 입력을 자모로. 영문 자판이면 두벌식 위치로, 한글 자모가 오면 그대로(복합은 풀어서) */
export function keyToJamo(key: string): string[] {
  if (key.length === 1) {
    const ascii = QWERTY[key.toLowerCase()]
    if (ascii) return [ascii]
    return decompose(key)
  }
  return []
}

/** 자모 배열 → 두벌식 영문 키. 문제 만들기 코드에 쓴다 */
export function jamoToQwerty(jamo: string[]): string {
  const rev = new Map(Object.entries(QWERTY).map(([k, v]) => [v, k]))
  return jamo.map((j) => rev.get(j) ?? '').join('')
}

export function qwertyToJamo(keys: string): string[] {
  return keys
    .toLowerCase()
    .split('')
    .map((k) => QWERTY[k])
    .filter((j): j is string => Boolean(j))
}
