/**
 * 2048 순수 로직. DOM/React 에 의존하지 않아 단위 테스트가 쉽다.
 * 보드는 row-major 2차원 배열, 0 은 빈 칸.
 */

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

/** 빈 칸 하나에 2(90%) 또는 4(10%) 를 놓는다. random 은 테스트용 주입. */
export function spawnTile(board: Board, random: () => number = Math.random): Board {
  const cells = emptyCells(board)
  if (cells.length === 0) return board
  const [r, c] = cells[Math.floor(random() * cells.length)]
  const next = cloneBoard(board)
  next[r][c] = random() < 0.9 ? 2 : 4
  return next
}

/** 한 줄을 왼쪽으로 밀고 합친다. 같은 타일은 한 번의 이동에서 한 번만 합쳐진다. */
export function slideRow(row: number[]): { row: number[]; gained: number } {
  const tiles = row.filter((v) => v !== 0)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const merged = tiles[i] * 2
      out.push(merged)
      gained += merged
      i++
    } else {
      out.push(tiles[i])
    }
  }
  while (out.length < row.length) out.push(0)
  return { row: out, gained }
}

function transpose(board: Board): Board {
  return board[0].map((_, c) => board.map((row) => row[c]))
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse())
}

export function move(board: Board, dir: Direction): MoveResult {
  // 모든 방향을 "왼쪽으로 밀기" 로 정규화한 뒤 되돌린다.
  let work = cloneBoard(board)
  if (dir === 'right') work = reverseRows(work)
  if (dir === 'up') work = transpose(work)
  if (dir === 'down') work = reverseRows(transpose(work))

  let gained = 0
  work = work.map((row) => {
    const res = slideRow(row)
    gained += res.gained
    return res.row
  })

  if (dir === 'right') work = reverseRows(work)
  if (dir === 'up') work = transpose(work)
  if (dir === 'down') work = transpose(reverseRows(work))

  const moved = work.some((row, r) => row.some((v, c) => v !== board[r][c]))
  return { board: work, gained, moved }
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
}

export function newGame(random: () => number = Math.random): GameState {
  const board = spawnTile(spawnTile(emptyBoard(), random), random)
  return { board, score: 0, over: false, won: false }
}

/** 한 수를 진행한다. 움직임이 없으면 동일한 state 를 그대로 반환한다. */
export function step(state: GameState, dir: Direction, random: () => number = Math.random): GameState {
  if (state.over) return state
  const res = move(state.board, dir)
  if (!res.moved) return state
  const board = spawnTile(res.board, random)
  const score = state.score + res.gained
  return {
    board,
    score,
    won: state.won || maxTile(board) >= 2048,
    over: !canMove(board),
  }
}
