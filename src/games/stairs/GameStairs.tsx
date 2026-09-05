import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost, GameOptions } from '../types'
import { newStairs, press, tick, type Dir, type StairsState } from './logic'

import { drawWith } from './draw'

function draw(canvas: HTMLCanvasElement, state: StairsState) {
  drawWith(canvas, state.steps, state.energy, state.rules.maxEnergy, state.dirAt)
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
