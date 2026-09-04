import type { GameDefinition } from '../types'
import { Game2048 } from './Game2048'

export const game2048: GameDefinition = {
  id: '2048',
  name: '2048',
  description: '같은 숫자를 합쳐 2048 을 만드세요.',
  Component: Game2048,
}
