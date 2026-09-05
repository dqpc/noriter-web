import { useEffect, useRef } from 'react'
import type { PreviewProps } from '../types'
import { drawBoard, geometry, setupCanvas } from './draw'
import type { Board } from './logic'

export function Preview2048({ state }: PreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const board = Array.isArray(state.board) ? (state.board as Board) : null
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !board) return
    const draw = () => {
      const ctx = setupCanvas(canvas)
      if (ctx) drawBoard(ctx, geometry(canvas.clientWidth, board.length), board)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [board])
  return <canvas ref={ref} className="preview-canvas square" aria-label="2048 미리보기" />
}
