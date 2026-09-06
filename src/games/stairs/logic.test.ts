import { describe, expect, it } from 'vitest'
import {
  BONUS_EVERY,
  BONUS_RATIO,
  BOOST_STEPS,
  BOOST_WINDOW_MS,
  ITEM_MIN_STEP,
  WARMUP_START,
  WARMUP_STEPS,
  actionFor,
  displaySteps,
  drainRate,
  makeItems,
  makePattern,
  newStairs,
  press,
  tick,
} from './logic'

function climb(s: ReturnType<typeof newStairs>, to: number, stepMs = 300) {
  for (let i = s.steps + 1; i <= to; i++) s = press(s, actionFor(s, i), i * stepMs)
  return s
}

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
    let s = climb(newStairs(11), first - 1)
    const at = (first - 1) * 300 + ((s.energy * 0.6) / drainRate(s)) * 1000
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

    if (actionFor(s, s.steps + 1) === 'TURN') {
      const t2 = t + 900
      s = press(s, 'TURN', t2)
      expect(press(s, 'CLIMB', t2 + BOOST_WINDOW_MS + 1).steps - s.steps).toBeLessThanOrEqual(1)
      expect(press(s, 'CLIMB', t2 + 50).steps - s.steps).toBe(BOOST_STEPS)
    }
  })
  it('방 모드(autoStart)에서는 입력 없이도 타이머가 바로 돈다', () => {
    const s = newStairs(9, 1000, true)
    expect(s.startedAt).toBe(1000)
    expect(tick(s, 1500).energy).toBeLessThan(s.rules.maxEnergy)
  })
  it('에너지는 최대치를 넘지 않는다', () => {
    const s = climb(newStairs(3), 5)
    expect(s.steps).toBe(5)
    expect(s.energy).toBeLessThanOrEqual(s.rules.maxEnergy)
  })
  it('초반에는 에너지가 천천히 줄고, 워밍업이 끝나면 원래 속도가 된다', () => {
    const s0 = newStairs(3)
    const base = s0.rules.drainPerSec
    expect(drainRate(s0)).toBeCloseTo(base * WARMUP_START)
    const mid = climb(s0, WARMUP_STEPS / 2)
    expect(drainRate(mid)).toBeGreaterThan(drainRate(s0))
    expect(drainRate(mid)).toBeLessThan(base * (1 + mid.rules.drainGrowthPerStep * mid.steps))
    const done = climb(s0, WARMUP_STEPS)
    expect(drainRate(done)).toBeCloseTo(base * (1 + done.rules.drainGrowthPerStep * done.steps))
  })
  it('10칸마다 보너스 에너지를 받고 bonusAt 에 기록된다', () => {
    const s0 = newStairs(21)
    let s = climb(s0, BONUS_EVERY - 1)
    expect(s.bonusAt).toBeNull()
    s = tick(s, s.updatedAt + 1500)
    expect(s.ended).toBe(false)
    const before = s.energy
    s = press(s, actionFor(s, BONUS_EVERY), s.updatedAt)
    expect(s.steps).toBe(BONUS_EVERY)
    expect(s.bonusAt).toBe(BONUS_EVERY)
    const expected = s.itemAt(BONUS_EVERY)
      ? s.rules.maxEnergy
      : Math.min(s.rules.maxEnergy, before + s.rules.gainPerStep + s.rules.maxEnergy * BONUS_RATIO)
    expect(s.energy).toBeCloseTo(expected)
    s = press(s, actionFor(s, BONUS_EVERY + 1), s.updatedAt + 100)
    expect(s.bonusAt).toBe(BONUS_EVERY)
  })
  it('부스터로 10의 배수 칸을 지나쳐도 보너스를 받는다', () => {
    for (let seed = 1; seed < 200; seed++) {
      let s = climb(newStairs(seed), BONUS_EVERY - 2)
      if (actionFor(s, s.steps + 1) !== 'TURN') continue
      const t = s.updatedAt + 300
      s = press(s, 'TURN', t)
      expect(s.steps).toBe(BONUS_EVERY - 1)
      s = press(s, 'CLIMB', t + 50)
      expect(s.steps).toBe(BONUS_EVERY - 1 + BOOST_STEPS)
      expect(s.bonusAt).toBe(BONUS_EVERY)
      return
    }
    throw new Error('부스터 가능한 seed 를 찾지 못함')
  })
})
