import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { YutBoard } from './YutBoard'

const piece = (id: number, node: number, path: string | null, index: number) => ({
  id,
  node,
  path,
  index,
  finished: false,
})

/** 스크린샷 상황: 새 말(모, 0→5)과 판 위 말(개, 3→5)이 같은 도착지 5 로 갈 수 있다 */
function view() {
  return {
    players: [
      {
        id: 'me',
        pieces: [piece(0, 3, 'RING', 3), piece(1, 0, null, 0), piece(2, 0, null, 0)],
        finished: 0,
        bot: false,
        resigned: false,
        effects: [],
      },
      { id: 'you', pieces: [piece(0, 15, 'RING', 15)], finished: 0, bot: false, resigned: false, effects: [] },
    ],
    turn: 'me',
    actor: 'me',
    phase: 'MOVE',
    queue: [
      { result: 'MO', steps: 5 },
      { result: 'GAE', steps: 2 },
    ],
    sticks: [true, true, false, false],
    bonusThrows: 0,
    chooseThrow: false,
    deadline: null,
    legalMoves: [
      { pieceId: 0, result: 'MO', steps: 5, via: null, dest: 8, captures: 0, stacks: 0, blocked: 0 },
      { pieceId: 0, result: 'GAE', steps: 2, via: null, dest: 5, captures: 0, stacks: 0, blocked: 0 },
      { pieceId: 1, result: 'MO', steps: 5, via: null, dest: 5, captures: 0, stacks: 0, blocked: 0 },
      { pieceId: 1, result: 'GAE', steps: 2, via: null, dest: 2, captures: 0, stacks: 0, blocked: 0 },
    ],
    card: null,
    lastEvent: { type: 'throw', player: 'me', result: 'GAE', steps: 2, seq: 2 },
    ended: false,
    ranking: [],
    finishedOrder: [],
    options: { backdo: true, cards: false, pieces: 3, turnSeconds: 30, cardSeconds: 15, botDelaySeconds: 1 },
    names: [],
  }
}

describe('YutBoard selection: dest first, then piece', () => {
  it('tapping the destination then a candidate piece sends that move', async () => {
    const actions: Record<string, unknown>[] = []
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const players = [
      { id: 'me', nickname: 'me', character: 'snake' },
      { id: 'you', nickname: 'you', character: 'tiger' },
    ]
    await act(async () => {
      root.render(<YutBoard view={view()} me="me" players={players} onAction={(a) => actions.push(a)} />)
    })
    // 던지기 연출이 끝나야 active 가 된다
    await act(async () => {
      await new Promise((r) => setTimeout(r, 4000))
    })
    const nodes = host.querySelectorAll('.yut-node')
    expect(nodes.length).toBeGreaterThan(5)
    const dest = nodes[5] as SVGElement
    expect(dest.getAttribute('class'), 'node 5 is a target').toContain('target')
    await act(async () => {
      dest!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.textContent).toContain('어느 말로 갈까요')
    const pieces = host.querySelectorAll('.yut-piece.selectable')
    const labels = [...pieces].map((p) => p.getAttribute('class'))
    expect(pieces.length, labels.join(' | ')).toBeGreaterThanOrEqual(2)
    await act(async () => {
      pieces[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(actions.length, host.textContent ?? '').toBe(1)
    root.unmount()
  }, 15000)

  it('after picking the destination, every candidate piece is ringed and a chooser button sends the move', async () => {
    const actions: Record<string, unknown>[] = []
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const players = [
      { id: 'me', nickname: 'me', character: 'snake' },
      { id: 'you', nickname: 'you', character: 'tiger' },
    ]
    await act(async () => {
      root.render(<YutBoard view={view()} me="me" players={players} onAction={(a) => actions.push(a)} />)
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 4000))
    })
    const dest = host.querySelectorAll('.yut-node')[5] as SVGElement
    await act(async () => {
      dest.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.querySelectorAll('.yut-candidate-ring').length).toBe(2)
    const buttons = [...host.querySelectorAll('.yut-piece-btn')] as HTMLButtonElement[]
    expect(buttons.map((b) => b.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('새 말 · 모')]))
    await act(async () => {
      buttons.find((b) => b.textContent?.includes('새 말'))!.click()
    })
    expect(actions).toEqual([{ type: 'move', pieceId: 1, result: 'MO', steps: 5 }])
    root.unmount()
  }, 15000)
})
