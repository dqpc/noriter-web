import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost, GameOptions } from '../types'
import { mulberry32 } from '../../lib/random'
import { getPreference, setPreference } from '../../lib/storage'
import { formatDuration } from '../../lib/time'
import {
  DEFAULT_TARGET,
  TARGETS,
  isEnded,
  newGame,
  stepWithTrace,
  type Board,
  type Direction,
  type GameState,
  type TileMove,
} from './logic'

const COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: '#eee4da', fg: '#776e65' },
  4: { bg: '#ede0c8', fg: '#776e65' },
  8: { bg: '#f2b179', fg: '#f9f6f2' },
  16: { bg: '#f59563', fg: '#f9f6f2' },
  32: { bg: '#f67c5f', fg: '#f9f6f2' },
  64: { bg: '#f65e3b', fg: '#f9f6f2' },
  128: { bg: '#f2c14e', fg: '#5c4a00' },
  256: { bg: '#4fb286', fg: '#f9f6f2' },
  512: { bg: '#2e86de', fg: '#f9f6f2' },
  1024: { bg: '#8e44ad', fg: '#f9f6f2' },
  2048: { bg: '#e84393', fg: '#f9f6f2' },
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
const APP_ENV = import.meta.env.VITE_APP_ENV
const targets: readonly number[] = APP_ENV === 'dev' ? [64, ...TARGETS] : TARGETS

function readTarget(options?: GameOptions): number | null {
  const fromOptions = Number(options?.target)
  if (targets.includes(fromOptions)) return fromOptions
  return null
}

function lastTarget(): number {
  const saved = Number(getPreference('2048', 'target'))
  return targets.includes(saved) ? saved : DEFAULT_TARGET
}
const TIMER_TICK_MS = 50
const SLIDE_MS = 110 // 타일이 미끄러지는 시간
const POP_MS = 120 // 합쳐진 타일이 튀는 시간, 새 타일이 커지는 시간

interface Anim {
  startedAt: number
  moves: TileMove[]
  merged: Set<string>
  spawned: string | null
  board: Board
}

const key = (r: number, c: number) => `${r},${c}`

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

function drawBoard(ctx: CanvasRenderingContext2D, g: Geometry, board: Board, scaleAt?: (r: number, c: number) => number) {
  drawBackground(ctx, g, board.length)
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) return
      const [x, y] = cellOrigin(g, r, c)
      drawTile(ctx, g, x, y, v, scaleAt ? scaleAt(r, c) : 1)
    }),
  )
}

function drawAnimated(ctx: CanvasRenderingContext2D, g: Geometry, anim: Anim, now: number): boolean {
  const elapsed = now - anim.startedAt
  if (elapsed < SLIDE_MS) {
    drawBackground(ctx, g, anim.board.length)
    const t = easeOut(elapsed / SLIDE_MS)
    for (const m of anim.moves) {
      const [fx, fy] = cellOrigin(g, m.from[0], m.from[1])
      const [tx, ty] = cellOrigin(g, m.to[0], m.to[1])
      drawTile(ctx, g, fx + (tx - fx) * t, fy + (ty - fy) * t, m.value)
    }
    return false
  }
  const q = Math.min((elapsed - SLIDE_MS) / POP_MS, 1)
  drawBoard(ctx, g, anim.board, (r, c) => {
    const k = key(r, c)
    if (anim.merged.has(k)) return 1 + 0.18 * Math.sin(Math.PI * q)
    if (anim.spawned === k) return easeOut(q)
    return 1
  })
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

function makeRng(options?: GameOptions): () => number {
  const seed = Number(options?.seed)
  return Number.isInteger(seed) && seed > 0 ? mulberry32(seed) : Math.random
}

export function Game2048({ host, options }: { host: GameHost; options?: GameOptions }) {
  const fixedTarget = readTarget(options)
  const roomMode = fixedTarget !== null
  const [target, setTarget] = useState<number | null>(fixedTarget)
  const [initial] = useState(() => {
    const rng = makeRng(options)
    return { rng, state: newGame(rng, fixedTarget ?? DEFAULT_TARGET) }
  })
  const rngRef = useRef(initial.rng)
  const stateRef = useRef<GameState>(initial.state)
  const [score, setScore] = useState(0)
  const [ended, setEnded] = useState<{ won: boolean; elapsedMs: number } | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAt = useRef<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<Anim | null>(null)
  const rafRef = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const render = useCallback(function render() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCanvas(canvas)
    if (!ctx) return
    const g = geometry(canvas.clientWidth, stateRef.current.board.length)
    const anim = animRef.current
    if (!anim) {
      drawBoard(ctx, g, stateRef.current.board)
      return
    }
    if (drawAnimated(ctx, g, anim, performance.now())) {
      animRef.current = null
      if (isEnded(stateRef.current)) {
        const elapsed = startedAt.current === null ? 0 : performance.now() - startedAt.current
        setEnded({ won: stateRef.current.won, elapsedMs: elapsed })
      }
      return
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(render)
  }, [])

  const play = useCallback(
    (dir: Direction) => {
      if (target === null) return
      const res = stepWithTrace(stateRef.current, dir, rngRef.current)
      if (!res.moved) return
      if (startedAt.current === null) startedAt.current = performance.now()
      const merged = new Set<string>()
      for (const m of res.moves) if (m.merged) merged.add(key(m.to[0], m.to[1]))
      animRef.current = {
        startedAt: performance.now(),
        moves: res.moves,
        merged,
        spawned: res.spawned ? key(res.spawned[0], res.spawned[1]) : null,
        board: res.state.board,
      }
      stateRef.current = res.state
      setScore(res.state.score)
      render()
    },
    [render, target],
  )

  const startWith = useCallback(
    (next: number) => {
      cancelAnimationFrame(rafRef.current)
      animRef.current = null
      rngRef.current = makeRng(options)
      stateRef.current = newGame(rngRef.current, next)
      startedAt.current = null
      setScore(0)
      setElapsedMs(0)
      setEnded(null)
      setTarget(next)
      render()
    },
    [render, options],
  )

  const restart = useCallback(() => startWith(target ?? DEFAULT_TARGET), [startWith, target])

  const pickTarget = useCallback(
    (next: number) => {
      setPreference('2048', 'target', String(next))
      startWith(next)
    },
    [startWith],
  )

  const changeTarget = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    animRef.current = null
    setEnded(null)
    setTarget(null)
  }, [])

  useEffect(() => {
    host.onScore(score)
  }, [host, score])
  useEffect(() => {
    if (ended) host.onGameOver(stateRef.current.score, ended)
  }, [host, ended])

  useEffect(() => {
    if (ended) return
    const id = window.setInterval(() => {
      if (startedAt.current !== null) setElapsedMs(performance.now() - startedAt.current)
    }, TIMER_TICK_MS)
    return () => window.clearInterval(id)
  }, [ended])

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
      if (!dir || e.repeat) return
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
          <span className="value">{score}</span>
        </div>
        <div className="g2048-score">
          <span className="label">TIME</span>
          <span className="value g2048-time">{formatDuration(ended ? ended.elapsedMs : elapsedMs)}</span>
        </div>
        <div className="g2048-hud-actions">
          {roomMode ? (
            <span className="g2048-target-badge">목표 {target}</span>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={changeTarget}>
                목표 {target ?? '-'}
              </button>
              <button type="button" className="btn" onClick={restart} disabled={target === null}>
                새 게임
              </button>
            </>
          )}
        </div>
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
        {target === null && (
          <div className="g2048-overlay">
            <p>목표 타일</p>
            <div className="g2048-targets">
              {targets.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={t === lastTarget() ? 'btn' : 'btn btn-ghost'}
                  onClick={() => pickTarget(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {ended && target !== null && (
          <div className="g2048-overlay">
            <p>{ended.won ? `${target} 클리어!` : '게임 오버'}</p>
            <p className="g2048-final">{score}</p>
            {ended.won && <p className="g2048-clear-time">{formatDuration(ended.elapsedMs)}</p>}
            {!roomMode && (
              <div className="g2048-targets">
                <button type="button" className="btn" onClick={restart}>
                  다시 하기
                </button>
                <button type="button" className="btn btn-ghost" onClick={changeTarget}>
                  목표 변경
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="g2048-help">스와이프 또는 방향키로 타일을 합쳐 {target ?? "목표"} 를 만드세요.</p>
    </div>
  )
}
