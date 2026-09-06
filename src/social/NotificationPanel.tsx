import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { markAllRead, markRead, type Notification, type NotificationKind } from '../lib/auth'
import { timeAgo } from '../lib/timeAgo'

const ICON: Record<NotificationKind, string> = { WELCOME: '👋', RESULT: '🏁', BEST: '🏆', INVITE: '✉️' }

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, refreshNotifications, dismissInvite } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    refreshNotifications()
    dismissInvite()
    // 열어 본 것으로 치고 배지를 지운다. 초대의 '수락' 은 읽음과 무관하게 동작한다
    if (notifications.unread > 0)
      markAllRead()
        .then(() => refreshNotifications())
        .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accept = (n: Notification) => {
    if (!n.link) return
    markRead(n.id).catch(() => {})
    onClose()
    navigate(n.link)
  }

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel notify" onClick={(e) => e.stopPropagation()} aria-label="알림">
        <div className="panel-head">
          <span className="panel-title">알림</span>
          <button type="button" className="panel-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <ul className="notify-list">
          {notifications.items.length === 0 && <li className="room-hint">아직 알림이 없어요.</li>}
          {notifications.items.map((n) => (
            <li key={n.id} className={`notify-row kind-${n.kind.toLowerCase()} ${n.read ? '' : 'unread'}`}>
              <span className="notify-icon" aria-hidden>
                {ICON[n.kind]}
              </span>
              <span className="notify-text">
                <b>{n.title}</b>
                {n.body && <span>{n.body}</span>}
                {n.kind === 'INVITE' && n.link && (
                  <button type="button" className="btn btn-small notify-accept" onClick={() => accept(n)}>
                    수락하고 들어가기
                  </button>
                )}
              </span>
              <time className="notify-time">{timeAgo(n.createdAt)}</time>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
