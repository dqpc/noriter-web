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
  const steps = m.steps ?? STEPS[m.result] ?? 0
  let p = path ?? 'RING'
  let i = path ? index : 0
  let switched = m.via === null
  const branchAt = (node: number) => Object.keys(PATHS).find((k) => PATHS[k][0] === node && PATHS[k][1] === m.via)
  const out: number[] = []
  if (!switched) {
    const b = branchAt(PATHS[p][i])
    if (b) {
      p = b
      i = 0
      switched = true
    }
  }
  if (steps > 0) {
    for (let k = 0; k < steps; k++) {
      i += 1
      if (i >= PATHS[p].length) break
      const node = PATHS[p][i]
      out.push(node)
      if (!switched) {
        const b = branchAt(node)
        if (b) {
          p = b
          i = 0
          switched = true
        }
      }
    }
  } else if (i > 0) out.push(PATHS[p][i - 1])
  if (m.dest !== FINISH && out[out.length - 1] !== m.dest) return [m.dest]
  return out
}

/** 이전 위치에서 새 위치까지 실제로 지나가는 칸. 서버 판정 뒤 한 칸씩 움직이는 연출에 쓴다 */
export function stepsBetween(
  oldPath: string,
  oldIndex: number,
  next: { path: string | null; index: number; node: number; finished: boolean },
): number[] {
  const oldNodes = PATHS[oldPath]
  if (next.finished) return oldNodes.slice(oldIndex + 1)
  if (next.path === null) return []
  if (next.path === oldPath) {
    if (next.index > oldIndex) return oldNodes.slice(oldIndex + 1, next.index + 1)
    return [next.node]
  }
  const nodes = PATHS[next.path]
  if (nodes[0] === oldNodes[oldIndex]) return nodes.slice(1, next.index + 1)
  const out: number[] = []
  for (let i = oldIndex + 1; i < oldNodes.length; i++) {
    out.push(oldNodes[i])
    if (oldNodes[i] === next.node) return capped(out, next.node)
    if (nodes[0] === oldNodes[i]) return capped([...out, ...nodes.slice(1, next.index + 1)], next.node)
  }
  return [next.node]
}

/** 한 번에 앞으로 갈 수 있는 최대 칸수(모 5 + 욕심 1). 이보다 길면 빽도로 뒤 칸에 간 것이라 바로 도착 칸으로 */
const MAX_FORWARD = 6
function capped(route: number[], dest: number): number[] {
  return route.length > MAX_FORWARD ? [dest] : route
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

export interface YutEffect {
  id: string
  label: string
}

export interface YutPlayerView {
  id: string
  pieces: YutPieceView[]
  finished: number
  bot: boolean
  resigned: boolean
  effects: YutEffect[]
}

export interface YutMove {
  pieceId: number
  result: string
  steps: number
  via: number | null
  dest: number
  captures: number
  stacks: number
  blocked: number
}

export interface YutRolled {
  result: string
  steps: number
}

export interface YutCardInfo {
  id: string
  kind: 'ANGEL' | 'DEVIL'
  label: string
  description: string
}

export interface YutView {
  players: YutPlayerView[]
  turn: string
  actor: string
  phase: 'THROW' | 'MOVE' | 'CARD' | 'ENDED'
  queue: YutRolled[]
  sticks: boolean[]
  bonusThrows: number
  chooseThrow: boolean
  deadline: string | null
  legalMoves: YutMove[]
  card: { player: string; trigger: string; size: number } | null
  lastEvent: Record<string, unknown>
  ended: boolean
  ranking: string[]
  finishedOrder: string[]
  options: { backdo: boolean; cards: boolean; pieces: number; turnSeconds: number; cardSeconds: number }
  names: string[]
}

export function rolledLabel(r: YutRolled): string {
  const base = THROW_LABEL[r.result] ?? r.result
  const extra = r.steps - (STEPS[r.result] ?? 0)
  return extra > 0 ? `${base}+${extra}` : base
}

export function toYutView(raw: Record<string, unknown>): YutView {
  return raw as unknown as YutView
}
