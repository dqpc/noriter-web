import { describe, expect, it } from 'vitest'
import { COMBO_EVERY, effectFor } from './effects'
import { ITEM_MIN_STEP, actionFor, makeItems, newStairs, press, type StairsState } from './logic'

const STEP_MS = 150

/** 번개가 이정표 칸에 없는 seed. 번개는 COMBO 보다 우선이라 COMBO 검사에 방해된다 */
function seedWithoutItemAt(...steps: number[]): number {
  let seed = 1
  while (steps.some(makeItems(seed))) seed++
  return seed
}

function climbTo(seed: number, steps: number): StairsState {
  let s = newStairs(seed)
  for (let i = 1; i <= steps; i++) s = press(s, actionFor(s, i), i * STEP_MS)
  return s
}

describe('stairs effects', () => {
  it('일반 한 칸 오르기에는 아무것도 없다', () => {
    const before = climbTo(7, 3)
    const after = press(before, actionFor(before, 4), 4 * STEP_MS)
    expect(effectFor(before, after, 4 * STEP_MS)).toBeNull()
  })
  it('10칸마다 COMBO ×n', () => {
    const seed = seedWithoutItemAt(COMBO_EVERY, COMBO_EVERY * 2)
    const nine = climbTo(seed, COMBO_EVERY - 1)
    const ten = press(nine, actionFor(nine, COMBO_EVERY), COMBO_EVERY * STEP_MS)
    expect(effectFor(nine, ten, 1)).toMatchObject({ kind: 'combo', text: 'COMBO ×1 +20%', at: 1 })
    const nineteen = climbTo(seed, COMBO_EVERY * 2 - 1)
    const twenty = press(nineteen, actionFor(nineteen, COMBO_EVERY * 2), COMBO_EVERY * 2 * STEP_MS)
    expect(effectFor(nineteen, twenty, 2)?.text).toBe('COMBO ×2 +20%')
  })
  it('부스터 성공은 PERFECT!, 이정표를 지나도 부스터가 우선', () => {
    let s = newStairs(3)
    let i = 1
    while (actionFor(s, i) !== 'TURN' || i < COMBO_EVERY - 2) {
      s = press(s, actionFor(s, i), i * STEP_MS)
      i++
    }
    const turnAt = i * STEP_MS
    const turned = press(s, 'TURN', turnAt)
    const boosted = press(turned, 'CLIMB', turnAt + 50)
    expect(boosted.boost).not.toBeNull()
    expect(effectFor(turned, boosted, turnAt + 50)).toMatchObject({ kind: 'perfect', text: 'PERFECT!' })
  })
  it('번개를 밟으면 GOOD!', () => {
    const items = makeItems(11)
    let first = ITEM_MIN_STEP
    while (!items(first)) first++
    const before = climbTo(11, first - 1)
    const after = press(before, actionFor(before, first), first * STEP_MS)
    expect(after.energy).toBe(after.rules.maxEnergy)
    expect(effectFor(before, after, 0)).toMatchObject({ kind: 'good', text: 'GOOD!' })
  })
  it('떨어지면 없다', () => {
    const before = climbTo(7, 3)
    const fell = press(before, actionFor(before, 4) === 'TURN' ? 'CLIMB' : 'TURN', 4 * STEP_MS)
    expect(fell.fell).toBe(true)
    expect(effectFor(before, fell, 0)).toBeNull()
  })
  it('10칸 보너스는 COMBO 와 한 줄로, 보너스만 있으면 +20%', () => {
    const seed = seedWithoutItemAt(COMBO_EVERY)
    const nine = climbTo(seed, COMBO_EVERY - 1)
    const ten = press(nine, actionFor(nine, COMBO_EVERY), COMBO_EVERY * STEP_MS)
    expect(ten.bonusAt).toBe(COMBO_EVERY)
    expect(effectFor(nine, ten, 0)?.text).toBe('COMBO ×1 +20%')
    const before = climbTo(7, 4)
    const after = press(before, actionFor(before, 5), 5 * STEP_MS)
    expect(effectFor(before, { ...after, bonusAt: 5 }, 0)).toMatchObject({ kind: 'bonus', text: '+20%' })
  })
})
