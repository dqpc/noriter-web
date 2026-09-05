const PREFIX = 'noriter:'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    /* 사파리 프라이빗 모드 등에서는 저장이 실패할 수 있다 */
  }
}

export function getBestScore(gameId: string): number {
  const raw = safeGet(`${gameId}:best`)
  const n = raw === null ? 0 : Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function setBestScore(gameId: string, score: number): void {
  if (score > getBestScore(gameId)) safeSet(`${gameId}:best`, String(score))
}

export function getPlayerToken(): string {
  const saved = safeGet('player:id')
  if (saved && /^[A-Za-z0-9_-]{16,64}$/.test(saved)) return saved
  const token = crypto.randomUUID().replace(/-/g, '')
  safeSet('player:id', token)
  return token
}

export function getPreference(gameId: string, key: string): string | null {
  return safeGet(`${gameId}:pref:${key}`)
}

export function setPreference(gameId: string, key: string, value: string): void {
  safeSet(`${gameId}:pref:${key}`, value)
}
