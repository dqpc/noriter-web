import type { GameDefinition } from '../types'
import { Game2048 } from './Game2048'
import { Icon2048 } from './Icon2048'
import { Preview2048 } from './Preview2048'

export const game2048: GameDefinition = {
  id: '2048',
  name: '2048',
  description: '같은 숫자를 합쳐 2048 을 만드세요.',
  Icon: Icon2048,
  Preview: Preview2048,
  Component: Game2048,
}
