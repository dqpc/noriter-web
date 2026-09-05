import type { Board } from './logic'

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

export interface Geometry {
  size: number
  gap: number
  cell: number
}

export function geometry(size: number, n: number): Geometry {
  const gap = size * 0.03
  const cell = (size - gap * (n + 1)) / n
  return { size, gap, cell }
}

export function cellOrigin(g: Geometry, r: number, c: number): [number, number] {
  return [g.gap + c * (g.cell + g.gap), g.gap + r * (g.cell + g.gap)]
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawBackground(ctx: CanvasRenderingContext2D, g: Geometry, n: number) {
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

export function drawTile(ctx: CanvasRenderingContext2D, g: Geometry, x: number, y: number, value: number, scale = 1) {
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

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  board: Board,
  scaleAt?: (r: number, c: number) => number,
) {
  drawBackground(ctx, g, board.length)
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) return
      const [x, y] = cellOrigin(g, r, c)
      drawTile(ctx, g, x, y, v, scaleAt ? scaleAt(r, c) : 1)
    }),
  )
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
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
