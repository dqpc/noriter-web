import type { GameDefinition } from '../types'
import { GameWord } from './GameWord'
import { IconWord } from './IconWord'

export const word: GameDefinition = {
  id: 'word',
  name: '글딱지',
  description: '하루 한 낱말, 여섯 번의 기회.',
  Icon: IconWord,
  Component: GameWord,
  solo: true,
}
