import { createContext } from 'react'
import type { Activity, Me, Notification, NotificationList, Presence } from '../lib/auth'

export interface ActivityInfo {
  activity: Activity
  gameId?: string
  roomId?: string
}

export interface AuthState {
  /** undefined = 토큰 확인 중 */
  me: Me | null | undefined
  guestName: string | null
  /** 계정 또는 게스트 이름이 정해졌는가 */
  identified: boolean
  displayName: string
  signIn: (token: string, me: Me) => void
  signOut: () => void
  playAsGuest: (name: string) => void
  setPresence: (presence: Presence) => Promise<void>
  changeCharacter: (id: string) => void
  setActivity: (info: ActivityInfo | null) => void
  notifications: NotificationList
  refreshNotifications: () => Promise<NotificationList | null>
  /** 새로 도착한 초대 (배지·토스트용). 확인하면 비운다 */
  incomingInvite: Notification | null
  dismissInvite: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
