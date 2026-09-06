import { API_URL } from './api'

const TOKEN_KEY = 'noriter:auth:token'

export type Presence = 'ONLINE' | 'AWAY' | 'BUSY' | 'INVISIBLE'
export type Activity = 'MENU' | 'LOBBY' | 'PLAYING'
export type PresenceState = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'

export interface Me {
  id: number
  nickname: string
  email: string | null
  characterId: string | null
  presence: Presence
  createdAt: string
}

export interface PresenceInfo {
  state: PresenceState
  activity: Activity | null
  gameId: string | null
  roomId: string | null
}

export interface Profile {
  id: number
  nickname: string
  characterId: string | null
  createdAt: string
  presence: PresenceInfo
  friend: boolean
}

export interface Friend {
  id: number
  nickname: string
  characterId: string | null
  presence: PresenceInfo
}

export interface GameStats {
  gameId: string
  gameName: string
  turnBased: boolean
  plays: number
  best: number | null
  wins: number
}

export type NotificationKind = 'WELCOME' | 'RESULT' | 'BEST' | 'INVITE'

export interface Notification {
  id: number
  kind: NotificationKind
  title: string
  body: string | null
  link: string | null
  createdAt: string
  read: boolean
}

export interface NotificationList {
  unread: number
  items: Notification[]
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 저장 실패는 무시 */
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (init.body) headers['content-type'] = 'application/json'
  const token = getToken()
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`
    try {
      const data = (await res.json()) as { message?: string }
      if (data.message) message = data.message
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const lookupNickname = (nickname: string) =>
  call<Profile[]>(`/api/users?nickname=${encodeURIComponent(nickname)}`).then((list) => list[0] ?? null)

export const register = (nickname: string, password: string, email: string, characterId: string) =>
  call<{ token: string; user: Me }>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ nickname, password, email: email || null, characterId }),
  })

export const login = (nickname: string, password: string) =>
  call<{ token: string; user: Me }>('/api/sessions', { method: 'POST', body: JSON.stringify({ nickname, password }) })

export const fetchMe = () => call<Me>('/api/users/me')

export const updateMe = (patch: { presence?: Presence; characterId?: string }) =>
  call<Me>('/api/users/me', { method: 'PATCH', body: JSON.stringify(patch) })

export const fetchFriends = () => call<Friend[]>('/api/users/me/friends')
export const addFriend = (userId: number) => call<void>(`/api/users/me/friends/${userId}`, { method: 'PUT' })
export const removeFriend = (userId: number) => call<void>(`/api/users/me/friends/${userId}`, { method: 'DELETE' })
export const fetchProfile = (userId: number) => call<Profile>(`/api/users/${userId}`)
export const fetchStats = (userId: number) => call<GameStats[]>(`/api/users/${userId}/scores`)
export const fetchNotifications = () => call<NotificationList>('/api/users/me/notifications')
export const markAllRead = () =>
  call<void>('/api/users/me/notifications', { method: 'PATCH', body: JSON.stringify({ read: true }) })
export const markRead = (id: number) =>
  call<void>(`/api/users/me/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) })
export const recordPlay = (gameId: string, score: number) =>
  call<void>(`/api/games/${gameId}/plays`, { method: 'POST', body: JSON.stringify({ score }) })
export const inviteToRoom = (roomId: string, userId: number) =>
  call<void>(`/api/rooms/${roomId}/invitations`, { method: 'POST', body: JSON.stringify({ userId }) })

export const PRESENCE_LABEL: Record<PresenceState, string> = {
  ONLINE: '온라인',
  AWAY: '자리 비움',
  BUSY: '바쁨',
  OFFLINE: '오프라인',
}

export function describeActivity(p: PresenceInfo, gameName?: string): string {
  if (p.state === 'OFFLINE') return '오프라인'
  const game = gameName ?? p.gameId ?? ''
  if (p.activity === 'LOBBY') return `${game} 대기실`.trim()
  if (p.activity === 'PLAYING') return `${game} 하는 중`.trim()
  return '메뉴에서'
}
