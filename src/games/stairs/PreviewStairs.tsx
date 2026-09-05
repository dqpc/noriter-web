import { useEffect, useMemo, useRef } from 'react'
import type { PreviewProps } from '../types'
import { drawWith } from './draw'
import { RULES, makeItems, makePattern, type Dir } from './logic'

export function PreviewStairs({ state, options, character }: PreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const seed = Number(options?.seed) || 1
  const dirAt = useMemo(() => makePattern(seed), [seed])
  const itemAt = useMemo(() => makeItems(seed), [seed])
  const steps = Number(state.steps) || 0
  const facing: Dir = state.facing === 'L' ? 'L' : 'R'
  const energy = Number(state.energy) || 0
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () =>
      drawWith(canvas, steps, facing, energy, RULES.maxEnergy, dirAt, itemAt, steps, character ?? 'rabbit')
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [steps, facing, energy, dirAt, itemAt, character])
  return <canvas ref={ref} className="preview-canvas tall" aria-label="계단 미리보기" />
}
