import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { markRead } from '../lib/auth'
import { NotificationPanel } from './NotificationPanel'
import { PeoplePanel } from './PeoplePanel'
import { PresenceDot } from './PresenceDot'

/** 로그인했을 때 화면 구석에 떠 있는 사람·알림 버튼과 초대 토스트 */
export function SocialDock() {
  const { me, notifications, incomingInvite, dismissInvite } = useAuth()
  const [open, setOpen] = useState<'people' | 'notify' | null>(null)
  const navigate = useNavigate()
  if (!me) return null

  const myState = me.presence === 'INVISIBLE' ? 'OFFLINE' : me.presence
  const accept = () => {
    if (!incomingInvite?.link) return
    markRead(incomingInvite.id).catch(() => {})
    const link = incomingInvite.link
    dismissInvite()
    navigate(link)
  }

  return (
    <>
      <div className="dock" role="toolbar" aria-label="사람·알림">
        <button type="button" className="dock-btn" onClick={() => setOpen('people')} aria-label="사람들">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-8 1.3-8 4v2h9.5a5 5 0 0 1 2.2-4.6C10.6 13.5 9 13 8 13Zm8 0c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z"
            />
          </svg>
          <span className="dock-status">
            <PresenceDot state={myState} size={9} />
          </span>
        </button>
        <button
          type="button"
          className={`dock-btn ${notifications.unread > 0 ? 'has-unread' : ''}`}
          onClick={() => setOpen('notify')}
          aria-label={`알림${notifications.unread > 0 ? ` ${notifications.unread}개` : ''}`}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              fill="currentColor"
              d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm6-6v-5c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2Z"
            />
          </svg>
          {notifications.unread > 0 && (
            <span className="dock-badge">{notifications.unread > 99 ? '99+' : notifications.unread}</span>
          )}
        </button>
      </div>
      {open === 'people' && <PeoplePanel onClose={() => setOpen(null)} />}
      {open === 'notify' && <NotificationPanel onClose={() => setOpen(null)} />}
      {incomingInvite && open === null && (
        <div className="invite-toast fade-in" role="status">
          <span className="invite-toast-text">
            <b>{incomingInvite.title}</b>
            <small>{incomingInvite.body}</small>
          </span>
          <button type="button" className="btn btn-small" onClick={accept}>
            수락
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={dismissInvite}>
            나중에
          </button>
        </div>
      )}
    </>
  )
}
