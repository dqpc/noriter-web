import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost } from '../types'
import { newGame, step, type Board, type Direction, type GameState } from './logic'

const COLORS: Record<number, { bg: string; fg: string }> = {
  0: { bg: '#3f3a36', fg: '#3f3a36' },
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

function draw(canvas: HTMLCanvasElement, board: Board) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const size = canvas.clientWidth
  if (canvas.width !== size * dpr) {
    canvas.width = size * dpr
    canvas.height = size * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const n = board.length
  const gap = size * 0.03
  const cell = (size - gap * (n + 1)) / n
  const radius = cell * 0.1

  ctx.fillStyle = '#5c554f'
  roundRect(ctx, 0, 0, size, size, gap * 1.5)
  ctx.fill()

  board.forEach((row, r) =>
    row.forEach((v, c) => {
      const x = gap + c * (cell + gap)
      const y = gap + r * (cell + gap)
      const color = COLORS[v] ?? SUPER
      ctx.fillStyle = color.bg
      roundRect(ctx, x, y, cell, cell, radius)
      ctx.fill()
      if (v === 0) return
      const digits = String(v).length
      const fontSize = cell * (digits <= 2 ? 0.5 : digits === 3 ? 0.42 : 0.34)
      ctx.fillStyle = color.fg
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(v), x + cell / 2, y + cell / 2 + fontSize * 0.05)
    }),
  )
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

export function Game2048({ host }: { host: GameHost }) {
  const [state, setState] = useState<GameState>(() => newGame())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const reportedOver = useRef(false)

  const play = useCallback((dir: Direction) => {
    setState((prev) => step(prev, dir))
  }, [])

  const restart = useCallback(() => {
    reportedOver.current = false
    setState(newGame())
  }, [])

  // 점수/종료를 포털에 알린다.
  useEffect(() => {
    host.onScore(state.score)
  }, [host, state.score])
  useEffect(() => {
    if (state.over && !reportedOver.current) {
      reportedOver.current = true
      host.onGameOver(state.score)
    }
  }, [host, state.over, state.score])

  // 그리기: 상태 변경 및 리사이즈 때
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const render = () => draw(canvas, state.board)
    render()
    const ro = new ResizeObserver(render)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [state.board])

  // 키보드 입력
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

  // 터치 스와이프
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
