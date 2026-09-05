import type { Dir } from './logic'

export interface StairsView {
  steps: number
  facing: Dir
  energy: number
  maxEnergy: number
  drainPerSec: number
  started: boolean
  ended: boolean
  fell: boolean
  pattern: string
}

export function itemFromPattern(pattern: string): (i: number) => boolean {
  return (i) => pattern[i] === 'l' || pattern[i] === 'r'
}

const STEP_DX = 34
const STEP_DY = 22
const VISIBLE_STEPS = 14

const COLORS = {
  sky: '#1e2a3a',
  stair: '#5b6b7a',
  stairTop: '#9fb3c8',
  stairCurrent: '#f59e0b',
  stairCurrentTop: '#fbbf24',
  hero: '#fde68a',
  energyBg: '#3f3a36',
  energy: '#22c55e',
  energyLow: '#ef4444',
  bolt: '#fde047',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawBolt(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = COLORS.bolt
  ctx.beginPath()
  ctx.moveTo(cx + 2, cy - 12)
  ctx.lineTo(cx - 6, cy + 1)
  ctx.lineTo(cx - 1, cy + 1)
  ctx.lineTo(cx - 3, cy + 12)
  ctx.lineTo(cx + 6, cy - 2)
  ctx.lineTo(cx + 1, cy - 2)
  ctx.closePath()
  ctx.fill()
}

export function drawStairs(canvas: HTMLCanvasElement, v: StairsView) {
  const dirAt = (i: number): Dir => (v.pattern[i]?.toUpperCase() === 'L' ? 'L' : 'R')
  drawWith(canvas, v.steps, v.facing, v.energy, v.maxEnergy, dirAt, itemFromPattern(v.pattern))
}

export function drawWith(
  canvas: HTMLCanvasElement,
  steps: number,
  facing: Dir,
  energy: number,
  maxEnergy: number,
  dirAt: (i: number) => Dir,
  itemAt: (i: number) => boolean = () => false,
  shown: number = steps,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = COLORS.sky
  ctx.fillRect(0, 0, w, h)

  const stairX = (i: number) => {
    let x = 0
    for (let k = 1; k <= i; k++) x += dirAt(k) === 'L' ? -STEP_DX : STEP_DX
    return x
  }
  const posAt = (p: number) => {
    const i0 = Math.floor(p)
    const f = p - i0
    return [stairX(i0) + (stairX(i0 + 1) - stairX(i0)) * f, p * STEP_DY] as const
  }
  const [heroX, heroLift] = posAt(shown)
  const camX = w / 2 - heroX
  const camY = h * 0.68 + heroLift

  for (let i = Math.max(0, steps - 4); i <= steps + VISIBLE_STEPS; i++) {
    const x = camX + stairX(i) - STEP_DX / 2
    const y = camY - i * STEP_DY
    const current = i === steps
    ctx.fillStyle = current ? COLORS.stairCurrent : COLORS.stair
    roundRect(ctx, x, y, STEP_DX, STEP_DY + 6, 4)
    ctx.fill()
    ctx.fillStyle = current ? COLORS.stairCurrentTop : COLORS.stairTop
    roundRect(ctx, x, y, STEP_DX, 6, 3)
    ctx.fill()
    if (i > steps && itemAt(i)) drawBolt(ctx, x + STEP_DX / 2, y - 10)
  }

  const hx = camX + heroX
  const hy = camY - heroLift
  if (shown < steps) {
    for (let k = 1; k <= 3; k++) {
      const [gx, gl] = posAt(Math.max(0, shown - k * 0.6))
      ctx.globalAlpha = 0.35 - k * 0.1
      ctx.fillStyle = COLORS.hero
      ctx.beginPath()
      ctx.arc(camX + gx, camY - gl - 14, 9, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  ctx.fillStyle = COLORS.hero
  ctx.beginPath()
  ctx.arc(hx, hy - 14, 9, 0, Math.PI * 2)
  ctx.fill()
  roundRect(ctx, hx - 7, hy - 6, 14, 6, 3)
  ctx.fill()
  ctx.fillStyle = COLORS.sky
  ctx.beginPath()
  ctx.arc(hx + (facing === 'L' ? -4 : 4), hy - 15, 2.2, 0, Math.PI * 2)
  ctx.fill()

  const ratio = Math.max(0, Math.min(1, energy / maxEnergy))
  ctx.fillStyle = COLORS.energyBg
  roundRect(ctx, 16, 14, w - 32, 10, 5)
  ctx.fill()
  ctx.fillStyle = ratio < 0.3 ? COLORS.energyLow : COLORS.energy
  roundRect(ctx, 16, 14, Math.max(0, (w - 32) * ratio), 10, 5)
  ctx.fill()

  ctx.fillStyle = '#fafaf9'
  ctx.font = '700 40px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(String(steps), w / 2, 34)
}
