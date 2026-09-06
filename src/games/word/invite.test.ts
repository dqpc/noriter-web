import { describe, expect, it } from 'vitest'
import { inviterFrom, withoutBy } from './invite'

describe('invite link', () => {
  it('?by= 에서 초대자 id 를 읽는다', () => {
    expect(inviterFrom('?by=12')).toBe(12)
    expect(inviterFrom('?code=abc&by=7')).toBe(7)
    expect(inviterFrom('?by=abc')).toBeNull()
    expect(inviterFrom('?by=0')).toBeNull()
    expect(inviterFrom('?by=-3')).toBeNull()
    expect(inviterFrom('')).toBeNull()
  })

  it('by 만 떼고 나머지 쿼리는 남긴다', () => {
    expect(withoutBy('?by=3')).toBe('')
    expect(withoutBy('?code=abc&by=3')).toBe('?code=abc')
    expect(withoutBy('?code=abc')).toBe('?code=abc')
  })
})
