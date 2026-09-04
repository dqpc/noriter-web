import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost } from '../types'
import { newGame, stepWithTrace, type Board, type Direction, type GameState, type TileMove } from './logic'

const COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: '#eee4da', fg: '#776e65' },
  4: { bg: '#ede0c8', fg: '#776e65' },
  8: { bg: '#f2b179', fg: '#f9f6f2' },
  16: { bg: '#f59563', fg: '#f9f6f2' },
  32: { bg: '#f67c5f', fg: '#f9f6f2' },
  64: { bg: '#f65e3b', fg: '#f9f6f2' },
  128: { bg: '#edcf72', fg: '#f9f6f2' },
  256: { bg: '#edcc61', fg: '#f9f6f2' },
  512: { bg: '#edc850', fg: '#f9f6f2' },
  1024: { bg: '#edc53f', fg: '#f9f6f2' },
  2048: { bg: '#edc22e', fg: '#f9f6f2' },
}
const SUPER = { bg: '#3c3a32', fg: '#f9f6f2' }
const EMPTY_BG = '#3f3a36'
const BOARD_BG = '#5c554f'

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

const SWIPE_MIN_PX = 24
const SLIDE_MS = 110 // 타일이 미끄러지는 시간
const POP_MS = 120 // 합쳐진 타일이 튀는 시간, 새 타일이 커지는 시간

interface Anim {
  startedAt: number
  moves: TileMove[]
  mergedAt: Array<[number, number]>
  spawned: [number, number] | null
  board: Board
}

interface Geometry {
  size: number
  gap: number
  cell: number
}

function geometry(size: number, n: number): Geometry {
  const gap = size * 0.03
  const cell = (size - gap * (n + 1)) / n
  return { size, gap, cell }
}

function cellOrigin(g: Geometry, r: number, c: number): [number, number] {
  return [g.gap + c * (g.cell + g.gap), g.gap + r * (g.cell + g.gap)]
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
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

function drawBackground(ctx: CanvasRenderingContext2D, g: Geometry, n: number) {
  ctx.fillStyle = BOARD_BG
  roundRect(ctx, 0, 0, g.size, g.size, g.gap * 1.5)
  ctx.fill()
  ctx.fillStyle = EMPTY_BG
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const [x, y] = cellOrigin(g, r, c)
      roundRect(ctx, x, y, g.cell, g.cell, g.cell * 0.1)
      ctx.fill()
    }
  }
}

function drawTile(ctx: CanvasRenderingContext2D, g: Geometry, x: number, y: number, value: number, scale = 1) {
  const color = COLORS[value] ?? SUPER
  const size = g.cell * scale
  const ox = x + (g.cell - size) / 2
  const oy = y + (g.cell - size) / 2
  ctx.fillStyle = color.bg
  roundRect(ctx, ox, oy, size, size, size * 0.1)
  ctx.fill()
  const digits = String(value).length
  const fontSize = size * (digits <= 2 ? 0.5 : digits === 3 ? 0.42 : 0.34)
  ctx.fillStyle = color.fg
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(value), ox + size / 2, oy + size / 2 + fontSize * 0.05)
}

function drawStatic(ctx: CanvasRenderingContext2D, g: Geometry, board: Board) {
  drawBackground(ctx, g, board.length)
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) return
      const [x, y] = cellOrigin(g, r, c)
      drawTile(ctx, g, x, y, v)
    }),
  )
}

function drawAnimated(ctx: CanvasRenderingContext2D, g: Geometry, anim: Anim, now: number): boolean {
  const elapsed = now - anim.startedAt
  const n = anim.board.length
  drawBackground(ctx, g, n)

  if (elapsed < SLIDE_MS) {
    const t = easeOut(elapsed / SLIDE_MS)
    for (const m of anim.moves) {
      const [fx, fy] = cellOrigin(g, m.from[0], m.from[1])
      const [tx, ty] = cellOrigin(g, m.to[0], m.to[1])
      drawTile(ctx, g, fx + (tx - fx) * t, fy + (ty - fy) * t, m.value)
    }
    return false
  }

  const q = Math.min((elapsed - SLIDE_MS) / POP_MS, 1)
  const isMerged = (r: number, c: number) => anim.mergedAt.some(([mr, mc]) => mr === r && mc === c)
  const isSpawned = (r: number, c: number) => anim.spawned?.[0] === r && anim.spawned?.[1] === c
  anim.board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) return
      const [x, y] = cellOrigin(g, r, c)
      let scale = 1
      if (isMerged(r, c)) scale = 1 + 0.18 * Math.sin(Math.PI * q)
      else if (isSpawned(r, c)) scale = easeOut(q)
      drawTile(ctx, g, x, y, v, scale)
    }),
  )
  return q >= 1
}

function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const dpr = window.devicePixelRatio || 1
  const size = canvas.clientWidth
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

export function Game2048({ host }: { host: GameHost }) {
  const [state, setState] = useState<GameState>(() => newGame())
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<Anim | null>(null)
  const rafRef = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const reportedOver = useRef(false)

  const render = useCallback(function render() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCanvas(canvas)
    if (!ctx) return
    const g = geometry(canvas.clientWidth, stateRef.current.board.length)
    const anim = animRef.current
    if (!anim) {
      drawStatic(ctx, g, stateRef.current.board)
      return
    }
    const done = drawAnimated(ctx, g, anim, performance.now())
    if (done) {
      animRef.current = null
      drawStatic(ctx, g, stateRef.current.board)
    } else {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(render)
    }
  }, [])

  const play = useCallback(
    (dir: Direction) => {
      const res = stepWithTrace(stateRef.current, dir)
      if (!res.moved) return
      cancelAnimationFrame(rafRef.current)
      const mergedAt = new Map<string, [number, number]>()
      for (const m of res.moves) if (m.merged) mergedAt.set(m.to.join(','), m.to)
      animRef.current = {
        startedAt: performance.now(),
        moves: res.moves,
        mergedAt: [...mergedAt.values()],
        spawned: res.spawned,
        board: res.state.board,
      }
      stateRef.current = res.state
      setState(res.state)
      rafRef.current = requestAnimationFrame(render)
    },
    [render],
  )

  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    animRef.current = null
    reportedOver.current = false
    const next = newGame()
    stateRef.current = next
    setState(next)
    requestAnimationFrame(render)
  }, [render])

  useEffect(() => {
    host.onScore(state.score)
  }, [host, state.score])
  useEffect(() => {
    if (state.over && !reportedOver.current) {
      reportedOver.current = true
      host.onGameOver(state.score)
    }
  }, [host, state.over, state.score])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    render()
    const ro = new ResizeObserver(() => render())
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [render])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key]
      if (!dir) return
      e.preventDefault()
      play(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const onPointerDown = (e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return
    if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? 'right' : 'left')
    else play(dy > 0 ? 'down' : 'up')
  }

  return (
    <div className="g2048">
      <div className="g2048-hud">
        <div className="g2048-score">
          <span className="label">SCORE</span>
          <span className="value">{state.score}</span>
        </div>
        <button type="button" className="btn" onClick={restart}>
          새 게임
        </button>
      </div>
      <div className="g2048-board-wrap">
        <canvas
          ref={canvasRef}
          className="g2048-board"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (touchStart.current = null)}
          aria-label="2048 보드"
        />
        {state.over && (
          <div className="g2048-overlay">
            <p>게임 오버</p>
            <p className="g2048-final">{state.score}</p>
            <button type="button" className="btn" onClick={restart}>
              다시 하기
            </button>
          </div>
        )}
      </div>
      <p className="g2048-help">스와이프 또는 방향키로 타일을 합치세요.</p>
    </div>
  )
}
