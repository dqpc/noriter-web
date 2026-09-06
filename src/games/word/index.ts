import type { GameDefinition } from '../types'
import { GameWord } from './GameWord'
import { IconWord } from './IconWord'

export const word: GameDefinition = {
  id: 'word',
  name: '글딱지',
  description: '하루에 한 단어',
  Icon: IconWord,
  Component: GameWord,
  solo: true,
}
