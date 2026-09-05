import { mulberry32 } from '../../lib/random'

export type Dir = 'L' | 'R'

export interface StairsRules {
  maxEnergy: number
  drainPerSec: number
  gainPerStep: number
  drainGrowthPerStep: number
}

export const SPEEDS: Record<string, StairsRules> = {
  normal: { maxEnergy: 100, drainPerSec: 22, gainPerStep: 9, drainGrowthPerStep: 0.05 },
  fast: { maxEnergy: 100, drainPerSec: 30, gainPerStep: 8, drainGrowthPerStep: 0.08 },
}

export const DEFAULT_SPEED = 'normal'
export const ITEM_MIN_STEP = 5
export const ITEM_CHANCE = 0.08
const ITEM_SEED_MIX = 0x9e3779b9

export function rulesFor(speed: string | undefined): StairsRules {
  return SPEEDS[speed ?? DEFAULT_SPEED] ?? SPEEDS[DEFAULT_SPEED]
}

export interface StairsState {
  steps: number
  energy: number
  startedAt: number | null
  updatedAt: number
  ended: boolean
  fell: boolean
  rules: StairsRules
  dirAt: (i: number) => Dir
  itemAt: (i: number) => boolean
}

export function makePattern(seed: number): (i: number) => Dir {
  const rng = mulberry32(seed)
  const cache: Dir[] = ['R']
  return (i: number) => {
    while (cache.length <= i) cache.push(rng() < 0.5 ? 'L' : 'R')
    return cache[i]
  }
}

export function makeItems(seed: number): (i: number) => boolean {
  const rng = mulberry32((seed ^ ITEM_SEED_MIX) >>> 0)
  const cache: boolean[] = [false]
  return (i: number) => {
    while (cache.length <= i) cache.push(cache.length >= ITEM_MIN_STEP && rng() < ITEM_CHANCE)
    return cache[i]
  }
}

export function newStairs(seed: number, speed?: string, now = 0): StairsState {
  const rules = rulesFor(speed)
  return {
    steps: 0,
    energy: rules.maxEnergy,
    startedAt: null,
    updatedAt: now,
    ended: false,
    fell: false,
    rules,
    dirAt: makePattern(seed),
    itemAt: makeItems(seed),
  }
}

function drainRate(state: StairsState): number {
  return state.rules.drainPerSec * (1 + state.rules.drainGrowthPerStep * state.steps)
}

export function tick(state: StairsState, now: number): StairsState {
  if (state.ended || state.startedAt === null) return { ...state, updatedAt: now }
  const dt = Math.max(0, now - state.updatedAt) / 1000
  const energy = state.energy - drainRate(state) * dt
  if (energy <= 0) return { ...state, energy: 0, updatedAt: now, ended: true }
  return { ...state, energy, updatedAt: now }
}

export function press(state: StairsState, dir: Dir, now: number): StairsState {
  if (state.ended) return state
  const s = state.startedAt === null ? { ...state, startedAt: now, updatedAt: now } : tick(state, now)
  if (s.ended) return s
  if (s.dirAt(s.steps + 1) !== dir) return { ...s, ended: true, fell: true }
  const next = s.steps + 1
  return {
    ...s,
    steps: next,
    energy: s.itemAt(next) ? s.rules.maxEnergy : Math.min(s.rules.maxEnergy, s.energy + s.rules.gainPerStep),
  }
}
