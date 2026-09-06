import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost, GameOptions } from '../types'
import { mulberry32 } from '../../lib/random'
import { getPreference, setPreference } from '../../lib/storage'
import { formatDuration } from '../../lib/time'
import { cellOrigin, drawBackground, drawBoard, drawTile, easeOut, geometry, setupCanvas, type Geometry } from './draw'
import {
  DEFAULT_TARGET,
  DIRECTION_CODE,
  TARGETS,
  isEnded,
  newGame,
  stepWithTrace,
  type Board,
  type Direction,
  type GameState,
  type TileMove,
} from './logic'

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

function seedOf(options?: GameOptions): number | null {
  const seed = Number(options?.seed)
  return Number.isInteger(seed) && seed > 0 ? seed : null
}

const localSeed = () => Math.floor(Math.random() * 2147483646) + 1

function rngFor(seed: number | null): () => number {
  return seed === null ? Math.random : mulberry32(seed)
}

export function Game2048({ host, options }: { host: GameHost; options?: GameOptions }) {
  const fixedTarget = readTarget(options)
  const frozen = options?.frozen === true
  const roomMode = fixedTarget !== null
  const [target, setTarget] = useState<number | null>(fixedTarget)
  const [initial] = useState(() => {
    const seed = seedOf(options)
    const rng = rngFor(seed)
    return { seed, rng, state: newGame(rng, fixedTarget ?? DEFAULT_TARGET) }
  })
  const rngRef = useRef(initial.rng)
  const stateRef = useRef<GameState>(initial.state)
  // 지금 판의 seed. seed 가 있어야 입력 로그를 서버가 재생할 수 있다
  const seedRef = useRef<number | null>(initial.seed)
  // 혼자 하기는 목표를 고른 뒤에야 첫 판이 시작되므로, 마운트 때 받은 세션의 seed 를 그 첫 판에 쓴다
  const mountSeedUnusedRef = useRef(true)
  // 실제로 움직인 입력만 쌓는다. 안 움직인 입력은 난수를 안 쓰므로 재생에 없어야 한다
  const movesRef = useRef<string[]>([])
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
      if (target === null || frozen) return
      const res = stepWithTrace(stateRef.current, dir, rngRef.current)
      if (!res.moved) return
      movesRef.current.push(DIRECTION_CODE[dir])
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
      host.onState?.({ board: res.state.board, score: res.state.score, ended: isEnded(res.state) })
      render()
    },
    [render, target, host, frozen],
  )

  const startWith = useCallback(
    (next: number, seed: number | null) => {
      cancelAnimationFrame(rafRef.current)
      animRef.current = null
      seedRef.current = seed
      rngRef.current = rngFor(seed)
      stateRef.current = newGame(rngRef.current, next)
      movesRef.current = []
      startedAt.current = null
      setScore(0)
      setElapsedMs(0)
      setEnded(null)
      setTarget(next)
      render()
    },
    [render],
  )

  // 혼자 하기는 판마다 서버 세션(seed)을 새로 받는다. 방은 받은 seed 그대로
  const begin = useCallback(
    async (next: number) => {
      let seed = seedOf(options)
      if (mountSeedUnusedRef.current) mountSeedUnusedRef.current = false
      else if (host.startPlay) seed = (await host.startPlay()) ?? localSeed()
      startWith(next, seed)
    },
    [host, options, startWith],
  )

  const restart = useCallback(() => void begin(target ?? DEFAULT_TARGET), [begin, target])

  const pickTarget = useCallback(
    (next: number) => {
      setPreference('2048', 'target', String(next))
      void begin(next)
    },
    [begin],
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
    if (!ended) return
    const moves = seedRef.current === null ? undefined : movesRef.current.join('')
    host.onGameOver(stateRef.current.score, moves === undefined ? ended : { ...ended, moves })
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
    const held = new Set<string>()
    const onDown = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key]
      if (!dir) return
      e.preventDefault()
      if (e.repeat || held.has(e.key)) return
      held.add(e.key)
      play(dir)
    }
    const onUp = (e: KeyboardEvent) => held.delete(e.key)
    const onBlur = () => held.clear()
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
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
      <p className="g2048-help">스와이프 또는 방향키로 타일을 합쳐 {target ?? '목표'} 를 만드세요.</p>
    </div>
  )
}
