import { createContext } from 'react'
import type { Activity, Me, Notification, NotificationList, Presence } from '../lib/auth'
import type { DmMessage } from '../lib/dm'

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
  /** 안 읽은 쪽지 합계 */
  dmUnread: number
  refreshDm: () => Promise<void>
  /** 열려 있는 대화 화면이 새 쪽지를 받는 통로. 반환값으로 구독 해제. 처리했으면 true 를 돌려줘야 토스트가 안 뜬다 */
  subscribeDm: (listener: (m: DmMessage) => boolean) => () => void
  incomingDm: DmMessage | null
  dismissDm: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
