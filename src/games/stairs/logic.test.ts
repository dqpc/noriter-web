import { describe, expect, it } from 'vitest'
import { ITEM_MIN_STEP, makeItems, makePattern, newStairs, press, tick } from './logic'

describe('stairs', () => {
  it('같은 seed 는 같은 계단', () => {
    const a = makePattern(7)
    const b = makePattern(7)
    expect([1, 2, 3, 4, 5].map(a)).toEqual([1, 2, 3, 4, 5].map(b))
  })
  it('맞는 방향이면 오르고 에너지가 차며, 틀리면 떨어진다', () => {
    const s0 = newStairs(7)
    const d1 = s0.dirAt(1)
    const s1 = press(s0, d1, 1000)
    expect(s1.steps).toBe(1)
    expect(s1.startedAt).toBe(1000)
    const wrong = press(s1, s1.dirAt(2) === 'L' ? 'R' : 'L', 1100)
    expect(wrong.ended).toBe(true)
    expect(wrong.fell).toBe(true)
    expect(press(wrong, 'L', 1200)).toBe(wrong)
  })
  it('시작 전에는 에너지가 줄지 않고, 시작 후 방치하면 끝난다', () => {
    const s0 = newStairs(1)
    expect(tick(s0, 5000).energy).toBe(s0.rules.maxEnergy)
    const s1 = press(s0, s0.dirAt(1), 0)
    const later = tick(s1, 10_000)
    expect(later.ended).toBe(true)
    expect(later.fell).toBe(false)
    expect(later.energy).toBe(0)
  })
  it('번개 계단에 올라서면 에너지가 가득 찬다', () => {
    const items = makeItems(11)
    expect(items(0)).toBe(false)
    for (let i = 1; i < ITEM_MIN_STEP; i++) expect(items(i)).toBe(false)
    let first = ITEM_MIN_STEP
    while (!items(first)) first++
    let s = newStairs(11)
    for (let i = 1; i < first; i++) s = press(s, s.dirAt(i), i * 10)
    const rate = s.rules.drainPerSec * (1 + s.rules.drainGrowthPerStep * s.steps)
    const at = (first - 1) * 10 + ((s.energy * 0.6) / rate) * 1000
    s = tick(s, at)
    expect(s.ended).toBe(false)
    expect(s.energy).toBeLessThan(s.rules.maxEnergy * 0.5)
    s = press(s, s.dirAt(first), at)
    expect(s.energy).toBe(s.rules.maxEnergy)
  })
  it('에너지는 최대치를 넘지 않는다', () => {
    let s = newStairs(3)
    for (let i = 1; i <= 5; i++) s = press(s, s.dirAt(i), i * 10)
    expect(s.steps).toBe(5)
    expect(s.energy).toBeLessThanOrEqual(s.rules.maxEnergy)
  })
})
