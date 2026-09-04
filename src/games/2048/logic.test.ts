import { describe, expect, it } from 'vitest'
import { canMove, emptyBoard, move, newGame, slideRow, spawnTile, step, type Board } from './logic'

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
