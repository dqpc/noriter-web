import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CoopProps } from '../types'
import { drawStairs, type StairsView } from './draw'

function toView(raw: Record<string, unknown>): StairsView {
  return {
    steps: Number(raw.steps) || 0,
    energy: Number(raw.energy) || 0,
    maxEnergy: Number(raw.maxEnergy) || 100,
    drainPerSec: Number(raw.drainPerSec) || 0,
    started: Boolean(raw.started),
    ended: Boolean(raw.ended),
    fell: Boolean(raw.fell),
    pattern: typeof raw.pattern === 'string' ? raw.pattern : 'R',
  }
}

export function CoopStairs({ view, receivedAt, myRole, onInput }: CoopProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const v = useMemo(() => toView(view), [view])

  const frame = useCallback(
    function frame() {
      const canvas = canvasRef.current
      if (!canvas) return
      const elapsed = v.started && !v.ended ? (performance.now() - receivedAt) / 1000 : 0
      const energy = Math.max(0, v.energy - v.drainPerSec * elapsed)
      drawStairs(canvas, { ...v, energy })
      if (!v.ended) rafRef.current = requestAnimationFrame(frame)
    },
    [v, receivedAt],
  )

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [frame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if ((e.key === 'ArrowLeft' || e.key === 'a') && myRole === 'L') onInput({ dir: 'L' })
      else if ((e.key === 'ArrowRight' || e.key === 'd') && myRole === 'R') onInput({ dir: 'R' })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [myRole, onInput])

  return (
    <div className="stairs">
      <div className="stairs-board-wrap">
        <canvas ref={canvasRef} className="stairs-board" aria-label="계단 (협동)" />
        {v.ended && (
          <div className="g2048-overlay">
            <p>{v.fell ? '떨어졌다!' : '지쳤다…'}</p>
            <p className="g2048-final">{v.steps} 칸</p>
          </div>
        )}
      </div>
      <div className="stairs-pads">
        <button
          type="button"
          className="stairs-pad"
          disabled={myRole !== 'L' || v.ended}
          onPointerDown={() => onInput({ dir: 'L' })}
          aria-label="왼쪽"
        >
          ◀
        </button>
        <button
          type="button"
          className="stairs-pad"
          disabled={myRole !== 'R' || v.ended}
          onPointerDown={() => onInput({ dir: 'R' })}
          aria-label="오른쪽"
        >
          ▶
        </button>
      </div>
      <p className="g2048-help">
        {myRole === 'L' ? '당신은 왼쪽 담당입니다.' : myRole === 'R' ? '당신은 오른쪽 담당입니다.' : '관전 중'} 다음 계단이 내 쪽이면
        누르세요.
      </p>
    </div>
  )
}
