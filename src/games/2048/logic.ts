export const SIZE = 4

export type Board = number[][]
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface MoveResult {
  board: Board
  gained: number
  moved: boolean
}

export function emptyBoard(size = SIZE): Board {
  return Array.from({ length: size }, () => Array<number>(size).fill(0))
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

export function emptyCells(board: Board): Array<[number, number]> {
  const cells: Array<[number, number]> = []
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) cells.push([r, c])
    }),
  )
  return cells
}

export function pickSpawn(
  board: Board,
  random: () => number = Math.random,
): { cell: [number, number]; value: number } | null {
  const cells = emptyCells(board)
  if (cells.length === 0) return null
  const cell = cells[Math.floor(random() * cells.length)]
  return { cell, value: random() < 0.9 ? 2 : 4 }
}

export function spawnTile(board: Board, random: () => number = Math.random): Board {
  const pick = pickSpawn(board, random)
  if (!pick) return board
  const next = cloneBoard(board)
  next[pick.cell[0]][pick.cell[1]] = pick.value
  return next
}

export function slideRow(row: number[]): { row: number[]; gained: number } {
  const { row: out, gained } = traceRow(row)
  return { row: out, gained }
}

export interface TileMove {
  from: [number, number]
  to: [number, number]
  value: number
  merged: boolean
}

interface LineMove {
  from: number
  to: number
  value: number
  merged: boolean
}

export function traceRow(row: number[]): { row: number[]; gained: number; moves: LineMove[] } {
  const idx: number[] = []
  row.forEach((v, i) => {
    if (v !== 0) idx.push(i)
  })
  const out: number[] = []
  const moves: LineMove[] = []
  let gained = 0
  for (let i = 0; i < idx.length; i++) {
    const a = idx[i]
    const to = out.length
    if (i + 1 < idx.length && row[a] === row[idx[i + 1]]) {
      const b = idx[i + 1]
      out.push(row[a] * 2)
      gained += row[a] * 2
      moves.push({ from: a, to, value: row[a], merged: true })
      moves.push({ from: b, to, value: row[b], merged: true })
      i++
    } else {
      out.push(row[a])
      moves.push({ from: a, to, value: row[a], merged: false })
    }
  }
  while (out.length < row.length) out.push(0)
  return { row: out, gained, moves }
}

function toCell(dir: Direction, n: number, i: number, j: number): [number, number] {
  switch (dir) {
    case 'left':
      return [i, j]
    case 'right':
      return [i, n - 1 - j]
    case 'up':
      return [j, i]
    case 'down':
      return [n - 1 - j, i]
  }
}

export interface TraceResult extends MoveResult {
  moves: TileMove[]
}

export function moveWithTrace(board: Board, dir: Direction): TraceResult {
  const n = board.length
  const next = emptyBoard(n)
  const moves: TileMove[] = []
  let gained = 0
  for (let i = 0; i < n; i++) {
    const line: number[] = []
    for (let j = 0; j < n; j++) {
      const [r, c] = toCell(dir, n, i, j)
      line.push(board[r][c])
    }
    const res = traceRow(line)
    gained += res.gained
    res.row.forEach((v, j) => {
      const [r, c] = toCell(dir, n, i, j)
      next[r][c] = v
    })
    res.moves.forEach((m) =>
      moves.push({
        from: toCell(dir, n, i, m.from),
        to: toCell(dir, n, i, m.to),
        value: m.value,
        merged: m.merged,
      }),
    )
  }
  const moved = next.some((row, r) => row.some((v, c) => v !== board[r][c]))
  return { board: next, gained, moved, moves }
}

export function move(board: Board, dir: Direction): MoveResult {
  const { board: b, gained, moved } = moveWithTrace(board, dir)
  return { board: b, gained, moved }
}

export function canMove(board: Board): boolean {
  if (emptyCells(board).length > 0) return true
  const n = board.length
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = board[r][c]
      if (c + 1 < n && board[r][c + 1] === v) return true
      if (r + 1 < n && board[r + 1][c] === v) return true
    }
  }
  return false
}

export function maxTile(board: Board): number {
  return Math.max(...board.flat())
}

export interface GameState {
  board: Board
  score: number
  over: boolean
  won: boolean
  target: number
}

export const TARGETS = [512, 1024, 2048] as const
export const DEFAULT_TARGET = 2048

export function newGame(random: () => number = Math.random, target = DEFAULT_TARGET): GameState {
  const board = spawnTile(spawnTile(emptyBoard(), random), random)
  return { board, score: 0, over: false, won: false, target }
}

export function isEnded(state: GameState): boolean {
  return state.over || state.won
}

export interface StepResult {
  state: GameState
  moved: boolean
  moves: TileMove[]
  spawned: [number, number] | null
}

export function stepWithTrace(
  state: GameState,
  dir: Direction,
  random: () => number = Math.random,
): StepResult {
  if (isEnded(state)) return { state, moved: false, moves: [], spawned: null }
  const res = moveWithTrace(state.board, dir)
  if (!res.moved) return { state, moved: false, moves: [], spawned: null }
  const pick = pickSpawn(res.board, random)!
  const board = cloneBoard(res.board)
  board[pick.cell[0]][pick.cell[1]] = pick.value
  const spawned = pick.cell
  const score = state.score + res.gained
  return {
    state: {
      board,
      score,
      won: maxTile(board) >= state.target,
      over: !canMove(board),
      target: state.target,
    },
    moved: true,
    moves: res.moves,
    spawned,
  }
}

export function step(state: GameState, dir: Direction, random: () => number = Math.random): GameState {
  return stepWithTrace(state, dir, random).state
}
