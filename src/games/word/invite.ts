/** 카톡 카드 링크 `?by=<userId>` 로 들어온 사람에게 보낸 사람을 친구로 권하기 위한 헬퍼 */

const PENDING = 'noriter:word:inviter'
const SEEN = 'noriter:word:inviters-seen'

export function inviterFrom(search: string): number | null {
  const raw = new URLSearchParams(search).get('by')
  if (raw === null || !/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return id > 0 ? id : null
}

/** by 만 떼어낸 쿼리. 새로고침마다 배너가 다시 뜨지 않게 URL 에서 지울 때 쓴다 */
export function withoutBy(search: string): string {
  const params = new URLSearchParams(search)
  params.delete('by')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// 게스트가 배너에서 가입하기를 누르면 게이트가 다시 떠 화면이 내려가므로, 그동안 초대자를 세션에 남겨 둔다
export function rememberPending(id: number): void {
  try {
    sessionStorage.setItem(PENDING, String(id))
  } catch {
    /* 저장 실패는 무시 */
  }
}

export function readPending(): number | null {
  try {
    const raw = sessionStorage.getItem(PENDING)
    return raw && /^\d+$/.test(raw) ? Number(raw) : null
  } catch {
    return null
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING)
  } catch {
    /* 무시 */
  }
}

export function inviterSeen(id: number): boolean {
  return seenList().includes(id)
}

export function markInviterSeen(id: number): void {
  const list = seenList()
  if (list.includes(id)) return
  try {
    localStorage.setItem(SEEN, JSON.stringify([...list, id].slice(-50)))
  } catch {
    /* 무시 */
  }
}

function seenList(): number[] {
  try {
    const raw = localStorage.getItem(SEEN)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : []
  } catch {
    return []
  }
}
