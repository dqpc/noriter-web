// 서버 Board2048 포팅이 웹 로직과 같은 결과를 내는지 검증할 케이스 생성.
// 사용: node scripts/replay-cases-2048.ts <출력 경로>   (Node 24, 타입 제거 실행)
import { writeFileSync } from 'node:fs'
import { mulberry32 } from '../src/lib/random.ts'
import { DIRECTION_CODE, TARGETS, isEnded, newGame, step, type Direction } from '../src/games/2048/logic.ts'

const DIRS: Direction[] = ['up', 'down', 'left', 'right']
const CASES = 1000
const MAX_MOVES = 400

const cases = Array.from({ length: CASES }, (_, i) => {
  const seed = i + 1
  const target = TARGETS[i % TARGETS.length]
  const rng = mulberry32(seed)
  const picker = mulberry32(seed * 7919 + 13)
  let state = newGame(rng, target)
  let moves = ''
  for (let n = 0; n < MAX_MOVES && !isEnded(state); n++) {
    const dir = DIRS[Math.floor(picker() * DIRS.length)]
    const next = step(state, dir, rng)
    if (next === state) continue
    moves += DIRECTION_CODE[dir]
    state = next
  }
  return { seed, target, moves, score: state.score, board: state.board.flat(), won: state.won, over: state.over }
})

const out = process.argv[2] ?? 'replay-cases-2048.json'
writeFileSync(out, JSON.stringify(cases))
console.log(`${cases.length} cases → ${out}`)
