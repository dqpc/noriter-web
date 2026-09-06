export type Status = 'correct' | 'present' | 'absent'

/** Wordle 판정. 정답에 있는 개수만큼만 correct → present 순으로 준다 */
export function judge(guess: readonly string[], answer: readonly string[]): Status[] {
  const result: Status[] = guess.map(() => 'absent')
  const remaining = new Map<string, number>()
  answer.forEach((a, i) => {
    if (guess[i] === a) result[i] = 'correct'
    else remaining.set(a, (remaining.get(a) ?? 0) + 1)
  })
  guess.forEach((g, i) => {
    if (result[i] === 'correct') return
    const left = remaining.get(g) ?? 0
    if (left > 0) {
      result[i] = 'present'
      remaining.set(g, left - 1)
    }
  })
  return result
}

/** 어렵게 풀기: 직전 추측에서 파악된 자모를 반드시 써야 한다. 어기면 안내 문구, 아니면 null */
export function hardModeError(
  guess: readonly string[],
  prevGuess: readonly string[] | undefined,
  prevStatuses: readonly Status[] | undefined,
): string | null {
  if (!prevGuess || !prevStatuses) return null
  const mustInclude: string[] = []
  for (let i = 0; i < prevGuess.length; i++) {
    if (prevStatuses[i] === 'correct') {
      if (guess[i] !== prevGuess[i]) return `'${prevGuess[i]}' 자모는 ${i + 1}번째에 꼭 쓰여야 합니다.`
    } else if (prevStatuses[i] === 'present') {
      mustInclude.push(prevGuess[i])
    }
  }
  const pool = [...guess]
  prevGuess.forEach((j, i) => {
    if (prevStatuses[i] === 'correct') pool.splice(pool.indexOf(j), 1)
  })
  for (const j of mustInclude) {
    const at = pool.indexOf(j)
    if (at < 0) return `추측에 꼭 '${j}' 자모가 들어가야 합니다.`
    pool.splice(at, 1)
  }
  return null
}

const RANK: Record<Status, number> = { absent: 0, present: 1, correct: 2 }

/** 키보드 색: 자모마다 지금까지 가장 좋은 판정 */
export function keyStatuses(rows: readonly (readonly string[])[], statuses: readonly (readonly Status[])[]) {
  const map = new Map<string, Status>()
  rows.forEach((row, r) =>
    row.forEach((j, i) => {
      const s = statuses[r]?.[i]
      if (!s) return
      const cur = map.get(j)
      if (!cur || RANK[s] > RANK[cur]) map.set(j, s)
    }),
  )
  return map
}
