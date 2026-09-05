import type { GameDefinition } from '../types'
import { CoopStairs } from './CoopStairs'
import { GameStairs } from './GameStairs'
import { IconStairs } from './IconStairs'

export const stairs: GameDefinition = {
  id: 'stairs',
  name: '계단 오르기',
  description: '다음 계단이 있는 쪽을 빠르게 누르세요.',
  Icon: IconStairs,
  modes: ['VERSUS', 'COOP'],
  Coop: CoopStairs,
  Component: GameStairs,
}
