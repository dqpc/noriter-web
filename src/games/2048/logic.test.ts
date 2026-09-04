import { describe, expect, it } from 'vitest'
import {
  canMove,
  emptyBoard,
  move,
  moveWithTrace,
  newGame,
  slideRow,
  spawnTile,
  step,
  stepWithTrace,
  traceRow,
  type Board,
} from './logic'

describe('slideRow', () => {
  it('빈 칸을 건너뛰고 왼쪽으로 민다', () => {
    expect(slideRow([0, 2, 0, 2]).row).toEqual([4, 0, 0, 0])
  })
  it('같은 타일은 한 번만 합쳐진다', () => {
    expect(slideRow([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8 })
    expect(slideRow([4, 4, 8, 0])).toEqual({ row: [8, 8, 0, 0], gained: 8 })
  })
  it('다른 타일은 그대로 둔다', () => {
    expect(slideRow([2, 4, 8, 16]).row).toEqual([2, 4, 8, 16])
  })
})

describe('move', () => {
  const board: Board = [
    [2, 0, 0, 2],
    [0, 4, 0, 0],
    [0, 0, 0, 0],
    [2, 0, 0, 0],
  ]
  it('left', () => {
    const r = move(board, 'left')
    expect(r.board[0]).toEqual([4, 0, 0, 0])
    expect(r.gained).toBe(4)
    expect(r.moved).toBe(true)
  })
  it('right', () => {
    expect(move(board, 'right').board[0]).toEqual([0, 0, 0, 4])
  })
  it('up', () => {
    const r = move(board, 'up')
    expect(r.board.map((row) => row[0])).toEqual([4, 0, 0, 0])
  })
  it('down', () => {
    const r = move(board, 'down')
    expect(r.board.map((row) => row[0])).toEqual([0, 0, 0, 4])
  })
  it('움직임이 없으면 moved=false', () => {
    const stuck: Board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    expect(move(stuck, 'left').moved).toBe(false)
    expect(move(stuck, 'up').moved).toBe(false)
  })
})

describe('canMove', () => {
  it('빈 칸이 있으면 true', () => {
    expect(canMove(emptyBoard())).toBe(true)
  })
  it('가득 찼지만 합칠 수 있으면 true', () => {
    expect(
      canMove([
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 4],
      ]),
    ).toBe(true)
  })
  it('가득 차고 합칠 수 없으면 false', () => {
    expect(
      canMove([
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2],
      ]),
    ).toBe(false)
  })
})

describe('spawnTile / newGame / step', () => {
  it('spawnTile 은 빈 칸 하나에 2 또는 4 를 놓는다', () => {
    const b = spawnTile(emptyBoard(), () => 0)
    expect(b.flat().filter((v) => v !== 0)).toEqual([2])
    const b4 = spawnTile(emptyBoard(), () => 0.95)
    expect(b4.flat().filter((v) => v !== 0)).toEqual([4])
  })
  it('newGame 은 타일 2개로 시작한다', () => {
    const s = newGame()
    expect(s.board.flat().filter((v) => v !== 0)).toHaveLength(2)
    expect(s.score).toBe(0)
  })
  it('step 은 점수를 누적하고 타일을 하나 추가한다', () => {
    const state = { board: emptyBoard(), score: 0, over: false, won: false }
    state.board[0] = [2, 2, 0, 0]
    const next = step(state, 'left', () => 0)
    expect(next.score).toBe(4)
    expect(next.board.flat().filter((v) => v !== 0)).toHaveLength(2)
  })
  it('움직임이 없으면 같은 state 를 반환한다', () => {
    const state = { board: emptyBoard(), score: 0, over: false, won: false }
    state.board[0] = [2, 0, 0, 0]
    expect(step(state, 'left')).toBe(state)
  })
})

describe('traceRow / moveWithTrace', () => {
  it('traceRow 는 각 타일의 출발·도착을 기록한다', () => {
    const r = traceRow([2, 0, 2, 4])
    expect(r.row).toEqual([4, 4, 0, 0])
    expect(r.moves).toEqual([
      { from: 0, to: 0, value: 2, merged: true },
      { from: 2, to: 0, value: 2, merged: true },
      { from: 3, to: 1, value: 4, merged: false },
    ])
  })
  it('moveWithTrace 는 move 와 같은 보드를 내고 좌표를 방향에 맞게 매핑한다', () => {
    const board: Board = [
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 2],
      [0, 0, 0, 0],
    ]
    const r = moveWithTrace(board, 'down')
    expect(r.board).toEqual(move(board, 'down').board)
    expect(r.board[3][3]).toBe(4)
    expect(r.moves).toHaveLength(2)
    expect(r.moves.every((m) => m.to[0] === 3 && m.to[1] === 3 && m.merged)).toBe(true)
    expect(r.moves.map((m) => m.from)).toEqual([[2, 3], [0, 3]])
  })
  it('stepWithTrace 는 새 타일 위치를 알려 준다', () => {
    const state = { board: emptyBoard(), score: 0, over: false, won: false }
    state.board[0] = [0, 0, 0, 2]
    const r = stepWithTrace(state, 'left', () => 0)
    expect(r.moved).toBe(true)
    expect(r.state.board[0][0]).toBe(2)
    expect(r.spawned).not.toBeNull()
    const [sr, sc] = r.spawned!
    expect(r.state.board[sr][sc]).toBe(2)
    expect(sr === 0 && sc === 0).toBe(false)
  })
})
