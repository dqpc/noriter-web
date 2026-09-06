import { mulberry32 } from '../../lib/random'

export type Dir = 'L' | 'R'
export type Action = 'TURN' | 'CLIMB'

export interface StairsRules {
  maxEnergy: number
  drainPerSec: number
  gainPerStep: number
  drainGrowthPerStep: number
}

export const RULES: StairsRules = { maxEnergy: 100, drainPerSec: 22, gainPerStep: 9, drainGrowthPerStep: 0.05 }
export const BOOST_WINDOW_MS = 120
export const BOOST_STEPS = 4
export const BOOST_DURATION_MS = 240
export const ITEM_MIN_STEP = 3
export const ITEM_CHANCE = 0.12
/** 초반 감소 완화: 0칸에서 60% 로 시작해 WARMUP_STEPS 칸에서 100% */
export const WARMUP_STEPS = 30
export const WARMUP_START = 0.6
/** BONUS_EVERY 칸마다 최대 에너지의 BONUS_RATIO 만큼 회복 */
export const BONUS_EVERY = 10
export const BONUS_RATIO = 0.2
const ITEM_SEED_MIX = 0x9e3779b9

export interface StairsState {
  steps: number
  facing: Dir
  energy: number
  startedAt: number | null
  updatedAt: number
  ended: boolean
  fell: boolean
  rules: StairsRules
  dirAt: (i: number) => Dir
  itemAt: (i: number) => boolean
  lastTurnAt: number | null
  lastBoostAt: number | null
  boost: { from: number; startedAt: number } | null
  /** 마지막으로 보너스 에너지를 받은 칸 (연출용) */
  bonusAt: number | null
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

export function newStairs(seed: number, now = 0, autoStart = false): StairsState {
  const rules = RULES
  const dirAt = makePattern(seed)
  return {
    steps: 0,
    facing: dirAt(1),
    energy: rules.maxEnergy,
    startedAt: autoStart ? now : null,
    updatedAt: now,
    ended: false,
    fell: false,
    rules,
    dirAt,
    itemAt: makeItems(seed),
    lastTurnAt: null,
    lastBoostAt: null,
    boost: null,
    bonusAt: null,
  }
}

export function drainRate(state: StairsState): number {
  const warmup = WARMUP_START + (1 - WARMUP_START) * Math.min(1, state.steps / WARMUP_STEPS)
  return state.rules.drainPerSec * (1 + state.rules.drainGrowthPerStep * state.steps) * warmup
}

function bonusBetween(from: number, to: number): number | null {
  const last = Math.floor(to / BONUS_EVERY) * BONUS_EVERY
  return last > from ? last : null
}

function gain(s: StairsState, from: number, to: number): { energy: number; bonusAt: number | null } {
  let energy = s.energy + s.rules.gainPerStep * (to - from)
  const bonusAt = bonusBetween(from, to)
  if (bonusAt !== null) energy += s.rules.maxEnergy * BONUS_RATIO
  for (let i = from + 1; i <= to; i++) if (s.itemAt(i)) energy = s.rules.maxEnergy
  return { energy: Math.min(s.rules.maxEnergy, energy), bonusAt: bonusAt ?? s.bonusAt }
}

export function tick(state: StairsState, now: number): StairsState {
  if (state.ended || state.startedAt === null) return { ...state, updatedAt: now }
  const dt = Math.max(0, now - state.updatedAt) / 1000
  const energy = state.energy - drainRate(state) * dt
  if (energy <= 0) return { ...state, energy: 0, updatedAt: now, ended: true }
  return { ...state, energy, updatedAt: now }
}

export function press(state: StairsState, action: Action, now: number): StairsState {
  if (state.ended) return state
  const s = state.startedAt === null ? { ...state, startedAt: now, updatedAt: now } : tick(state, now)
  if (s.ended) return s
  if (action === 'CLIMB' && canBoost(s, now)) return boost(s, now)
  const facing: Dir = action === 'TURN' ? (s.facing === 'L' ? 'R' : 'L') : s.facing
  if (s.dirAt(s.steps + 1) !== facing) return { ...s, facing, ended: true, fell: true }
  const next = s.steps + 1
  return {
    ...s,
    ...gain(s, s.steps, next),
    facing,
    steps: next,
    lastTurnAt: action === 'TURN' ? now : s.lastTurnAt,
  }
}

export function actionFor(state: StairsState, i: number): Action {
  return state.dirAt(i) === state.facing ? 'CLIMB' : 'TURN'
}

function canBoost(s: StairsState, now: number): boolean {
  return s.lastTurnAt !== null && now - s.lastTurnAt <= BOOST_WINDOW_MS
}

function boost(s: StairsState, now: number): StairsState {
  const from = s.steps
  const to = from + BOOST_STEPS
  return {
    ...s,
    ...gain(s, from, to),
    steps: to,
    facing: s.dirAt(to),
    lastTurnAt: null,
    lastBoostAt: now,
    boost: { from, startedAt: now },
  }
}

/** 부스터 애니메이션용 표시 위치 (계단 단위, 소수) */
export function displaySteps(s: StairsState, now: number): number {
  if (!s.boost) return s.steps
  const t = Math.min(1, (now - s.boost.startedAt) / BOOST_DURATION_MS)
  const eased = 1 - (1 - t) * (1 - t)
  return s.boost.from + (s.steps - s.boost.from) * eased
}
