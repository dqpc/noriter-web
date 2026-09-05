export const NODE_POS: ReadonlyArray<readonly [number, number]> = [
  [500, 500],
  [500, 412],
  [500, 324],
  [500, 236],
  [500, 148],
  [500, 60],
  [412, 60],
  [324, 60],
  [236, 60],
  [148, 60],
  [60, 60],
  [60, 148],
  [60, 236],
  [60, 324],
  [60, 412],
  [60, 500],
  [148, 500],
  [236, 500],
  [324, 500],
  [412, 500],
  [427, 133],
  [353, 207],
  [280, 280],
  [207, 353],
  [133, 427],
  [133, 133],
  [207, 207],
  [353, 353],
  [427, 427],
]

export const CORNERS = new Set([0, 5, 10, 15])
export const CENTER = 22
export const FINISH = -2

export const THROW_LABEL: Record<string, string> = {
  BACKDO: '빽도',
  DO: '도',
  GAE: '개',
  GEOL: '걸',
  YUT: '윷',
  MO: '모',
}

export interface YutPieceView {
  id: number
  node: number
  path: string | null
  index: number
  finished: boolean
}

export interface YutPlayerView {
  id: string
  pieces: YutPieceView[]
  finished: number
  bot: boolean
}

export interface YutMove {
  pieceId: number
  result: string
  via: number | null
  dest: number
  captures: number
  stacks: number
}

export interface YutView {
  players: YutPlayerView[]
  turn: string
  phase: 'THROW' | 'MOVE' | 'ENDED'
  queue: string[]
  sticks: boolean[]
  bonusThrows: number
  deadline: string | null
  legalMoves: YutMove[]
  lastEvent: Record<string, unknown>
  ended: boolean
  ranking: string[]
  finishedOrder: string[]
  options: { backdo: boolean; pieces: number; turnSeconds: number }
  names: string[]
}

export function toYutView(raw: Record<string, unknown>): YutView {
  return raw as unknown as YutView
}
