import { describe, expect, it } from 'vitest'
import { mulberry32 } from './random'

describe('mulberry32', () => {
  it('같은 seed 는 같은 수열', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('다른 seed 는 다른 수열, 값은 [0,1)', () => {
    const a = mulberry32(1)()
    const b = mulberry32(2)()
    expect(a).not.toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
})
