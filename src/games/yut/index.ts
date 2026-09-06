import type { GameDefinition } from '../types'
import { IconYut } from './IconYut'
import { YutBoard } from './YutBoard'

export const yut: GameDefinition = {
  id: 'yut',
  name: '윷놀이',
  description: '다들 아는 그 게임.',
  Icon: IconYut,
  turnBased: true,
  Turn: YutBoard,
  idleView: (playerIds) => ({
    players: playerIds.map((id) => ({ id, pieces: [], finished: 0, bot: false, resigned: false, effects: [] })),
    turn: '',
    actor: '',
    phase: 'THROW',
    queue: [],
    sticks: [false, false, false, false],
    bonusThrows: 0,
    chooseThrow: false,
    deadline: null,
    legalMoves: [],
    card: null,
    lastEvent: { type: 'start' },
    ended: false,
    ranking: [],
    finishedOrder: [],
    options: { backdo: true, cards: true, pieces: 3, turnSeconds: 30, cardSeconds: 15 },
    names: [],
  }),
}
