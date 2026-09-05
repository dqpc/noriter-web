import { describe, expect, it } from 'vitest'
import {
  BOOST_COOLDOWN_MS,
  BOOST_STEPS,
  BOOST_WINDOW_MS,
  ITEM_MIN_STEP,
  actionFor,
  displaySteps,
  makeItems,
  makePattern,
  newStairs,
  press,
  tick,
} from './logic'

describe('stairs', () => {
  it('같은 seed 는 같은 계단', () => {
    const a = makePattern(7)
    const b = makePattern(7)
    expect([1, 2, 3, 4, 5].map(a)).toEqual([1, 2, 3, 4, 5].map(b))
  })
  it('시작은 첫 계단을 바라보고, 오르기는 보는 방향, 방향전환은 돌아서며 한 칸', () => {
    const s0 = newStairs(7)
    expect(s0.facing).toBe(s0.dirAt(1))
    const s1 = press(s0, 'CLIMB', 1000)
    expect(s1.steps).toBe(1)
    expect(s1.startedAt).toBe(1000)
    const need = actionFor(s1, 2)
    const s2 = press(s1, need, 1100)
    expect(s2.steps).toBe(2)
    expect(s2.facing).toBe(s2.dirAt(2))
    const wrong = press(s2, actionFor(s2, 3) === 'TURN' ? 'CLIMB' : 'TURN', 1200)
    expect(wrong.ended).toBe(true)
    expect(wrong.fell).toBe(true)
    expect(press(wrong, 'CLIMB', 1300)).toBe(wrong)
  })
  it('시작 전에는 에너지가 줄지 않고, 시작 후 방치하면 끝난다', () => {
    const s0 = newStairs(1)
    expect(tick(s0, 5000).energy).toBe(s0.rules.maxEnergy)
    const s1 = press(s0, 'CLIMB', 0)
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
    for (let i = 1; i < first; i++) s = press(s, actionFor(s, i), i * 300)
    const rate = s.rules.drainPerSec * (1 + s.rules.drainGrowthPerStep * s.steps)
    const at = (first - 1) * 300 + ((s.energy * 0.6) / rate) * 1000
    s = tick(s, at)
    expect(s.ended).toBe(false)
    expect(s.energy).toBeLessThan(s.rules.maxEnergy * 0.5)
    s = press(s, actionFor(s, first), at)
    expect(s.energy).toBe(s.rules.maxEnergy)
  })
  it('방향 전환 직후 오르기를 따닥 누르면 부스터로 4칸 오른다', () => {
    let s = newStairs(5)
    let t = 0
    while (actionFor(s, s.steps + 1) !== 'TURN') {
      t += 300
      s = press(s, 'CLIMB', t)
    }
    t += 300
    s = press(s, 'TURN', t)
    const before = s
    s = press(s, 'CLIMB', t + BOOST_WINDOW_MS)
    expect(s.steps).toBe(before.steps + BOOST_STEPS)
    expect(s.facing).toBe(s.dirAt(s.steps))
    expect(s.boost?.from).toBe(before.steps)
    expect(displaySteps(s, t + BOOST_WINDOW_MS)).toBe(before.steps)
    expect(displaySteps(s, t + BOOST_WINDOW_MS + 1000)).toBe(s.steps)
    expect(s.energy).toBeGreaterThanOrEqual(before.energy)

    s = press(s, 'TURN', t + 500)
    const again = press(s, 'CLIMB', t + 520)
    expect(again.steps - s.steps).toBeLessThanOrEqual(1)

    s = press(s, actionFor(s, s.steps + 1), t + BOOST_COOLDOWN_MS + 600)
    if (actionFor(s, s.steps + 1) === 'TURN') {
      const t2 = t + BOOST_COOLDOWN_MS + 900
      s = press(s, 'TURN', t2)
      expect(press(s, 'CLIMB', t2 + BOOST_WINDOW_MS + 1).steps - s.steps).toBeLessThanOrEqual(1)
    }
  })
  it('에너지는 최대치를 넘지 않는다', () => {
    let s = newStairs(3)
    for (let i = 1; i <= 5; i++) s = press(s, actionFor(s, i), i * 300)
    expect(s.steps).toBe(5)
    expect(s.energy).toBeLessThanOrEqual(s.rules.maxEnergy)
  })
})
