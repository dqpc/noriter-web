import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost, GameOptions } from '../types'
import { newStairs, press, tick, type Dir, type StairsState } from './logic'

const STEP_DX = 34
const STEP_DY = 22
const VISIBLE_STEPS = 14

const COLORS = {
  sky: '#1e2a3a',
  stair: '#5b6b7a',
  stairTop: '#9fb3c8',
  stairNext: '#f59e0b',
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

function stairX(dirAt: (i: number) => Dir, i: number): number {
  let x = 0
  for (let k = 1; k <= i; k++) x += dirAt(k) === 'L' ? -STEP_DX : STEP_DX
  return x
}

function draw(canvas: HTMLCanvasElement, state: StairsState) {
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

  const heroX = stairX(state.dirAt, state.steps)
  const camX = w / 2 - heroX
  const camY = h * 0.68 + state.steps * STEP_DY

  for (let i = Math.max(0, state.steps - 4); i <= state.steps + VISIBLE_STEPS; i++) {
    const x = camX + stairX(state.dirAt, i) - STEP_DX / 2
    const y = camY - i * STEP_DY
    ctx.fillStyle = i === state.steps + 1 ? COLORS.stairNext : COLORS.stair
    roundRect(ctx, x, y, STEP_DX, STEP_DY + 6, 4)
    ctx.fill()
    ctx.fillStyle = i === state.steps + 1 ? '#fbbf24' : COLORS.stairTop
    roundRect(ctx, x, y, STEP_DX, 6, 3)
    ctx.fill()
  }

  const hx = camX + heroX
  const hy = camY - state.steps * STEP_DY
  ctx.fillStyle = COLORS.hero
  ctx.beginPath()
  ctx.arc(hx, hy - 14, 9, 0, Math.PI * 2)
  ctx.fill()
  roundRect(ctx, hx - 7, hy - 6, 14, 6, 3)
  ctx.fill()

  const ratio = state.energy / state.rules.maxEnergy
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
  ctx.fillText(String(state.steps), w / 2, 34)
}

function readSeed(options?: GameOptions): number {
  const seed = Number(options?.seed)
  return Number.isInteger(seed) && seed > 0 ? seed : Math.floor(Math.random() * 2147483646) + 1
}

export function GameStairs({ host, options }: { host: GameHost; options?: GameOptions }) {
  const roomMode = options?.seed !== undefined
  const speed = typeof options?.speed === 'string' ? options.speed : undefined
  const [initial] = useState(() => newStairs(readSeed(options), speed, performance.now()))
  const stateRef = useRef<StairsState>(initial)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const [steps, setSteps] = useState(0)
  const [ended, setEnded] = useState<{ fell: boolean } | null>(null)

  const frame = useCallback(function frame() {
    const s = tick(stateRef.current, performance.now())
    const wasEnded = stateRef.current.ended
    stateRef.current = s
    const canvas = canvasRef.current
    if (canvas) draw(canvas, s)
    if (s.ended && !wasEnded) setEnded({ fell: s.fell })
    if (!s.ended) rafRef.current = requestAnimationFrame(frame)
  }, [])

  const input = useCallback(
    (dir: Dir) => {
      const before = stateRef.current
      if (before.ended) return
      const after = press(before, dir, performance.now())
      stateRef.current = after
      if (after.steps !== before.steps) setSteps(after.steps)
      if (after.ended) {
        setEnded({ fell: after.fell })
        const canvas = canvasRef.current
        if (canvas) draw(canvas, after)
      } else if (before.startedAt === null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(frame)
      }
    },
    [frame],
  )

  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    stateRef.current = newStairs(readSeed(options), speed, performance.now())
    setSteps(0)
    setEnded(null)
    const canvas = canvasRef.current
    if (canvas) draw(canvas, stateRef.current)
  }, [options, speed])

  useEffect(() => {
    host.onScore(steps)
  }, [host, steps])
  useEffect(() => {
    if (ended) {
      const s = stateRef.current
      host.onGameOver(s.steps, { won: false, elapsedMs: s.startedAt === null ? 0 : s.updatedAt - s.startedAt })
    }
  }, [host, ended])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw(canvas, stateRef.current)
    const ro = new ResizeObserver(() => draw(canvas, stateRef.current))
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key === 'a') input('L')
      else if (e.key === 'ArrowRight' || e.key === 'd') input('R')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input])

  return (
    <div className="stairs">
      <div className="stairs-board-wrap">
        <canvas ref={canvasRef} className="stairs-board" aria-label="계단" />
        {ended && (
          <div className="g2048-overlay">
            <p>{ended.fell ? '떨어졌다!' : '지쳤다…'}</p>
            <p className="g2048-final">{steps} 칸</p>
            {!roomMode && (
              <button type="button" className="btn" onClick={restart}>
                다시 하기
              </button>
            )}
          </div>
        )}
      </div>
      <div className="stairs-pads">
        <button type="button" className="stairs-pad" onPointerDown={() => input('L')} aria-label="왼쪽">
          ◀
        </button>
        <button type="button" className="stairs-pad" onPointerDown={() => input('R')} aria-label="오른쪽">
          ▶
        </button>
      </div>
      <p className="g2048-help">다음 계단이 있는 쪽을 누르세요. 멈추면 에너지가 떨어집니다.</p>
    </div>
  )
}
