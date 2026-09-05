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

export const PATHS: Record<string, number[]> = {
  RING: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 0],
  A: [5, 20, 21, 22, 23, 24, 15, 16, 17, 18, 19, 0],
  B: [10, 25, 26, 22, 27, 28, 0],
  C: [22, 23, 24, 15, 16, 17, 18, 19, 0],
  D: [22, 27, 28, 0],
}
export const STEPS: Record<string, number> = { BACKDO: -1, DO: 1, GAE: 2, GEOL: 3, YUT: 4, MO: 5 }

export function routeOf(path: string | null, index: number, m: YutMove): number[] {
  const steps = STEPS[m.result] ?? 0
  let p = path ?? 'RING'
  let i = path ? index : 0
  if (m.via !== null) {
    const cur = PATHS[p][i]
    const branch = Object.keys(PATHS).find((k) => PATHS[k][0] === cur && PATHS[k][1] === m.via)
    if (branch) {
      p = branch
      i = 0
    }
  }
  const nodes = PATHS[p]
  const out: number[] = []
  if (steps > 0) for (let k = 1; k <= steps && i + k < nodes.length; k++) out.push(nodes[i + k])
  else if (i > 0) out.push(nodes[i - 1])
  if (m.dest !== FINISH && out[out.length - 1] !== m.dest) return [m.dest]
  return out
}

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
