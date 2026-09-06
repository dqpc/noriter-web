import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getMyCharacter, setMyCharacter } from '../characters'
import {
  fetchMe,
  fetchNotifications,
  getToken,
  setToken,
  updateMe,
  type Me,
  type Notification,
  type NotificationList,
} from '../lib/auth'
import { fetchConversations, type DmMessage } from '../lib/dm'
import { MeSocket } from '../lib/meSocket'
import { getPreference, setPreference } from '../lib/storage'
import { AuthContext, type ActivityInfo, type AuthState } from './context'

const EMPTY: NotificationList = { unread: 0, items: [] }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(() => (getToken() ? undefined : null))
  const [guestName, setGuestName] = useState<string | null>(() => getPreference('me', 'guest'))
  const [notifications, setNotifications] = useState<NotificationList>(EMPTY)
  const [incomingInvite, setIncomingInvite] = useState<Notification | null>(null)
  const [dmUnread, setDmUnread] = useState(0)
  const [incomingDm, setIncomingDm] = useState<DmMessage | null>(null)
  const dmListeners = useRef(new Set<(m: DmMessage) => boolean>())
  const activityRef = useRef<ActivityInfo>({ activity: 'MENU' })
  const socketRef = useRef<MeSocket | null>(null)

  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    fetchMe()
      .then((m) => {
        if (cancelled) return
        setMe(m)
        if (m.characterId) setMyCharacter(m.characterId)
      })
      .catch(() => {
        if (cancelled) return
        setToken(null)
        setMe(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    if (!getToken()) return null
    try {
      const list = await fetchNotifications()
      setNotifications(list)
      return list
    } catch {
      return null
    }
  }, [])

  const refreshDm = useCallback(async () => {
    if (!getToken()) return
    try {
      const list = await fetchConversations()
      setDmUnread(list.reduce((s, c) => s + c.unread, 0))
    } catch {
      /* 다음 푸시 때 다시 */
    }
  }, [])

  const sendActivity = useCallback(() => {
    const a = activityRef.current
    socketRef.current?.send({ type: 'activity', activity: a.activity, gameId: a.gameId, roomId: a.roomId })
  }, [])

  // 개인 채널: 붙어 있는 동안 온라인, 새 알림은 즉시 도착. 끊기면 1.5초마다 다시 붙는다
  const meId = me?.id
  useEffect(() => {
    const token = meId ? getToken() : null
    if (!token) return
    const socket = new MeSocket(token, {
      onOpen: () => {
        sendActivity()
        void refreshNotifications()
        void refreshDm()
      },
      onMessage: (m) => {
        if (m.type === 'dm') {
          let handled = false
          dmListeners.current.forEach((l) => {
            if (l(m.message)) handled = true
          })
          void refreshDm()
          if (!handled && m.message.senderId !== meId) setIncomingDm(m.message)
        } else if (m.type === 'notification') {
          setNotifications((n) => ({ unread: m.unread, items: [m.item, ...n.items.filter((i) => i.id !== m.item.id)] }))
          if (m.item.kind === 'INVITE') setIncomingInvite(m.item)
        }
      },
      onRejected: () => {
        setToken(null)
        setMe(null)
      },
    })
    socketRef.current = socket
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [meId, sendActivity, refreshNotifications, refreshDm])

  const value = useMemo<AuthState>(
    () => ({
      me,
      guestName,
      identified: Boolean(me) || Boolean(guestName),
      displayName: me?.nickname ?? guestName ?? '',
      signIn: (token, m) => {
        setToken(token)
        setMe(m)
        if (m.characterId) setMyCharacter(m.characterId)
        else updateMe({ characterId: getMyCharacter() }).catch(() => {})
      },
      signOut: () => {
        setToken(null)
        setMe(null)
        setNotifications(EMPTY)
        setIncomingInvite(null)
        setDmUnread(0)
        setIncomingDm(null)
      },
      playAsGuest: (name) => {
        setPreference('me', 'guest', name)
        if (name) setPreference('room', 'nickname', name)
        setGuestName(name || null)
      },
      setPresence: async (presence) => {
        const m = await updateMe({ presence })
        setMe(m)
      },
      changeCharacter: (id) => {
        setMyCharacter(id)
        if (me) {
          setMe({ ...me, characterId: id })
          updateMe({ characterId: id }).catch(() => {})
        }
      },
      setActivity: (info) => {
        activityRef.current = info ?? { activity: 'MENU' }
        sendActivity()
      },
      notifications,
      refreshNotifications,
      incomingInvite,
      dismissInvite: () => setIncomingInvite(null),
      dmUnread,
      refreshDm,
      subscribeDm: (listener) => {
        dmListeners.current.add(listener)
        return () => {
          dmListeners.current.delete(listener)
        }
      },
      incomingDm,
      dismissDm: () => setIncomingDm(null),
    }),
    [me, guestName, notifications, incomingInvite, dmUnread, incomingDm, sendActivity, refreshNotifications, refreshDm],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
