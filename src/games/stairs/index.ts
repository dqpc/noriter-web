import type { GameDefinition } from '../types'
import { GameStairs } from './GameStairs'
import { IconStairs } from './IconStairs'
import { PreviewStairs } from './PreviewStairs'

export const stairs: GameDefinition = {
  id: 'stairs',
  name: '계단 오르기',
  description: '방향 전환, 오르기. 끝없이.',
  Icon: IconStairs,
  Preview: PreviewStairs,
  Component: GameStairs,
}
