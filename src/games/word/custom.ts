import { jamoToQwerty, qwertyToJamo, WORD_LENGTH } from './jamo'

export interface CustomPuzzle {
  answer: string[]
  creator: string
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): string | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch {
    return null
  }
}

/** 정답은 두벌식 영문 키로 바꿔 넣는다. 링크만 봐서는 답이 안 보이게 */
export function encodeCustom(answer: string[], creator: string): string {
  return toBase64Url(`${jamoToQwerty(answer)}_${creator.trim()}`)
}

export function decodeCustom(code: string): CustomPuzzle | null {
  const raw = fromBase64Url(code)
  if (!raw) return null
  const at = raw.indexOf('_')
  if (at < 0) return null
  const answer = qwertyToJamo(raw.slice(0, at))
  if (answer.length !== WORD_LENGTH) return null
  return { answer, creator: raw.slice(at + 1) || '누군가' }
}

export function customLink(code: string): string {
  return `${location.origin}/games/word/play?code=${code}`
}
