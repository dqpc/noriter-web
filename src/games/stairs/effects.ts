import { BONUS_RATIO, type StairsState } from './logic'

export type EffectKind = 'combo' | 'perfect' | 'good' | 'bonus'

export interface Effect {
  kind: EffectKind
  text: string
  at: number
}

// 설정 화면이 생기면 사용자 토글로 옮긴다
export const showEffects = true
export const EFFECT_MS = 600
export const COMBO_EVERY = 10

const COLORS: Record<EffectKind, string> = {
  combo: '#fde047',
  perfect: '#7dd3fc',
  good: '#4ade80',
  bonus: '#4ade80',
}

/** 한 번의 입력으로 여러 이정표를 지나면 가장 눈에 띄는 것 하나만 */
export function effectFor(before: StairsState, after: StairsState, now: number): Effect | null {
  if (!showEffects || after.ended || after.steps <= before.steps) return null
  if (after.lastBoostAt !== null && after.lastBoostAt !== before.lastBoostAt)
    return { kind: 'perfect', text: 'PERFECT!', at: now }
  for (let i = before.steps + 1; i <= after.steps; i++)
    if (after.itemAt(i)) return { kind: 'good', text: 'GOOD!', at: now }
  const combo = Math.floor(after.steps / COMBO_EVERY)
  const bonus = after.bonusAt !== null && after.bonusAt !== before.bonusAt ? ` +${Math.round(BONUS_RATIO * 100)}%` : ''
  if (combo > Math.floor(before.steps / COMBO_EVERY)) return { kind: 'combo', text: `COMBO ×${combo}${bonus}`, at: now }
  if (bonus) return { kind: 'bonus', text: bonus.trim(), at: now }
  return null
}

export function drawEffect(canvas: HTMLCanvasElement, effect: Effect | null, now: number, reduceMotion: boolean) {
  if (!effect) return
  const t = (now - effect.at) / EFFECT_MS
  if (t < 0 || t >= 1) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const rise = reduceMotion ? 0 : 22 * (1 - (1 - t) * (1 - t))
  ctx.globalAlpha = reduceMotion ? 1 : Math.min(1, (1 - t) * 1.6)
  ctx.font = '800 16px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.strokeText(effect.text, w / 2, h * 0.3 - rise)
  ctx.fillStyle = COLORS[effect.kind]
  ctx.fillText(effect.text, w / 2, h * 0.3 - rise)
  ctx.globalAlpha = 1
}
