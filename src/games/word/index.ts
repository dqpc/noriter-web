import type { GameDefinition } from '../types'
import { GameWord } from './GameWord'
import { IconWord } from './IconWord'

export const word: GameDefinition = {
  id: 'word',
  name: '오늘의 단어',
  description: '하루 한 단어, 여섯 번의 기회.',
  Icon: IconWord,
  Component: GameWord,
  solo: true,
}
