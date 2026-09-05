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

export interface RememberedRoom {
  roomId: string
  gameId: string
}

function readRooms(): RememberedRoom[] {
  try {
    const list = JSON.parse(safeGet('room:active') ?? '[]') as unknown
    return Array.isArray(list) ? (list as RememberedRoom[]).filter((r) => r && r.roomId && r.gameId) : []
  } catch {
    return []
  }
}

export function getRememberedRooms(): RememberedRoom[] {
  return readRooms()
}

export function rememberRoom(roomId: string, gameId: string): void {
  const rest = readRooms().filter((r) => r.roomId !== roomId && r.gameId !== gameId)
  safeSet('room:active', JSON.stringify([{ roomId, gameId }, ...rest].slice(0, 5)))
}

export function forgetRoom(roomId: string): void {
  safeSet('room:active', JSON.stringify(readRooms().filter((r) => r.roomId !== roomId)))
}

export function getPreference(gameId: string, key: string): string | null {
  return safeGet(`${gameId}:pref:${key}`)
}

export function setPreference(gameId: string, key: string, value: string): void {
  safeSet(`${gameId}:pref:${key}`, value)
}
