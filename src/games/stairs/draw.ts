import type { Dir } from './logic'

export interface StairsView {
  steps: number
  energy: number
  maxEnergy: number
  drainPerSec: number
  started: boolean
  ended: boolean
  fell: boolean
  pattern: string
}

const STEP_DX = 34
const STEP_DY = 22
const VISIBLE_STEPS = 14

const COLORS = {
  sky: '#1e2a3a',
  stair: '#5b6b7a',
  stairTop: '#9fb3c8',
  stairNext: '#f59e0b',
  stairNextTop: '#fbbf24',
  hero: '#fde68a',
  energyBg: '#3f3a36',
  energy: '#22c55e',
  energyLow: '#ef4444',
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

export function drawStairs(canvas: HTMLCanvasElement, v: StairsView) {
  const dirAt = (i: number): Dir => (v.pattern[i] === 'L' ? 'L' : 'R')
  drawWith(canvas, v.steps, v.energy, v.maxEnergy, dirAt)
}

export function drawWith(
  canvas: HTMLCanvasElement,
  steps: number,
  energy: number,
  maxEnergy: number,
  dirAt: (i: number) => Dir,
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
  const heroX = stairX(steps)
  const camX = w / 2 - heroX
  const camY = h * 0.68 + steps * STEP_DY

  for (let i = Math.max(0, steps - 4); i <= steps + VISIBLE_STEPS; i++) {
    const x = camX + stairX(i) - STEP_DX / 2
    const y = camY - i * STEP_DY
    const next = i === steps + 1
    ctx.fillStyle = next ? COLORS.stairNext : COLORS.stair
    roundRect(ctx, x, y, STEP_DX, STEP_DY + 6, 4)
    ctx.fill()
    ctx.fillStyle = next ? COLORS.stairNextTop : COLORS.stairTop
    roundRect(ctx, x, y, STEP_DX, 6, 3)
    ctx.fill()
  }

  const hx = camX + heroX
  const hy = camY - steps * STEP_DY
  ctx.fillStyle = COLORS.hero
  ctx.beginPath()
  ctx.arc(hx, hy - 14, 9, 0, Math.PI * 2)
  ctx.fill()
  roundRect(ctx, hx - 7, hy - 6, 14, 6, 3)
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
