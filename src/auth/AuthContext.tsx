import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getMyCharacter, setMyCharacter } from '../characters'
import {
  fetchMe,
  fetchNotifications,
  getToken,
  heartbeat,
  setToken,
  updateMe,
  type Me,
  type Notification,
  type NotificationList,
} from '../lib/auth'
import { getPreference, setPreference } from '../lib/storage'
import { AuthContext, type ActivityInfo, type AuthState } from './context'

const HEARTBEAT_MS = 25_000
const NOTIFY_POLL_MS = 15_000

const EMPTY: NotificationList = { unread: 0, items: [] }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(() => (getToken() ? undefined : null))
  const [guestName, setGuestName] = useState<string | null>(() => getPreference('room', 'nickname'))
  const [notifications, setNotifications] = useState<NotificationList>(EMPTY)
  const [incomingInvite, setIncomingInvite] = useState<Notification | null>(null)
  const activityRef = useRef<ActivityInfo>({ activity: 'MENU' })
  const seenInvites = useRef<Set<number> | null>(null)

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
      const invites = list.items.filter((n) => n.kind === 'INVITE' && !n.read)
      if (seenInvites.current === null) {
        seenInvites.current = new Set(invites.map((n) => n.id))
      } else {
        const fresh = invites.find((n) => !seenInvites.current!.has(n.id))
        invites.forEach((n) => seenInvites.current!.add(n.id))
        if (fresh) setIncomingInvite(fresh)
      }
      return list
    } catch {
      return null
    }
  }, [])

  const beat = useCallback(() => {
    if (!getToken()) return
    const a = activityRef.current
    heartbeat(a.activity, a.gameId, a.roomId).catch(() => {})
  }, [])

  useEffect(() => {
    if (!me) return
    beat()
    const first = window.setTimeout(refreshNotifications, 0)
    const h = window.setInterval(beat, HEARTBEAT_MS)
    const n = window.setInterval(refreshNotifications, NOTIFY_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        beat()
        refreshNotifications()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(h)
      window.clearInterval(n)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [me, beat, refreshNotifications])

  const value = useMemo<AuthState>(
    () => ({
      me,
      guestName,
      identified: Boolean(me) || Boolean(guestName),
      displayName: me?.nickname ?? guestName ?? '',
      signIn: (token, m) => {
        setToken(token)
        seenInvites.current = null
        setMe(m)
        if (m.characterId) setMyCharacter(m.characterId)
        else updateMe({ characterId: getMyCharacter() }).catch(() => {})
      },
      signOut: () => {
        setToken(null)
        setMe(null)
        setNotifications(EMPTY)
        setIncomingInvite(null)
        seenInvites.current = null
      },
      playAsGuest: (name) => {
        setPreference('room', 'nickname', name)
        setGuestName(name)
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
        beat()
      },
      notifications,
      refreshNotifications,
      incomingInvite,
      dismissInvite: () => setIncomingInvite(null),
    }),
    [me, guestName, notifications, incomingInvite, beat, refreshNotifications],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
