import type { GameDefinition } from '../types'
import { IconYut } from './IconYut'
import { YutBoard } from './YutBoard'

export const yut: GameDefinition = {
  id: 'yut',
  name: '윷놀이',
  description: '윷을 던져 말 세 개를 먼저 내보내세요. 2~4명.',
  Icon: IconYut,
  turnBased: true,
  Turn: YutBoard,
}
