import { useEffect, useRef, useState } from 'react'
import { CharacterAvatar } from '../characters'
import { useAuth } from '../auth/useAuth'
import { ApiError } from '../lib/auth'
import { fetchMessages, markConversationRead, sendMessage, type Conversation, type DmMessage } from '../lib/dm'
import { timeAgo } from '../lib/timeAgo'

/** 사람들 패널 안의 1:1 쪽지 화면 */
export function DmView({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { me, subscribeDm, refreshDm } = useAuth()
  const [messages, setMessages] = useState<DmMessage[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const stickBottom = useRef(true)
  const convId = conversation.id

  const read = (id: number) =>
    markConversationRead(convId, id)
      .then(refreshDm)
      .catch(() => {})

  useEffect(() => {
    let cancelled = false
    fetchMessages(convId)
      .then((page) => {
        if (cancelled) return
        const asc = [...page].reverse()
        setMessages(asc)
        setHasMore(page.length >= 50)
        if (asc.length > 0) read(asc[asc.length - 1].id)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId])

  useEffect(
    () =>
      subscribeDm((m) => {
        if (m.conversationId !== convId) return false
        setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
        if (m.senderId !== me?.id) read(m.id)
        return true
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convId, subscribeDm, me?.id],
  )

  useEffect(() => {
    const el = listRef.current
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const loadOlder = async () => {
    if (!messages || messages.length === 0) return
    const el = listRef.current
    const before = el ? el.scrollHeight - el.scrollTop : 0
    const page = await fetchMessages(convId, messages[0].id).catch(() => [] as DmMessage[])
    stickBottom.current = false
    setMessages((list) => (list ? [...[...page].reverse(), ...list] : list))
    setHasMore(page.length >= 50)
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before
      stickBottom.current = true
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    setError(null)
    try {
      const m = await sendMessage(convId, body)
      setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
      setText('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '보내지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dm">
      <div className="dm-head">
        <button type="button" className="panel-close" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <CharacterAvatar id={conversation.otherCharacterId} size={30} />
        <b>{conversation.otherNickname}</b>
      </div>
      <div
        className="dm-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
      >
        {messages === null && <p className="room-hint">불러오는 중…</p>}
        {messages && hasMore && (
          <button type="button" className="btn btn-ghost btn-small dm-more" onClick={loadOlder}>
            이전 쪽지 더 보기
          </button>
        )}
        {messages && messages.length === 0 && <p className="room-hint">첫 쪽지를 보내 보세요.</p>}
        {messages?.map((m, i) => {
          const mine = m.senderId === me?.id
          const first = i === 0 || messages[i - 1].senderId !== m.senderId
          return (
            <div key={m.id} className={`dm-msg ${mine ? 'mine' : ''} ${first ? 'first' : ''}`}>
              <span className="dm-bubble">{m.body}</span>
              <time className="dm-time">{timeAgo(m.createdAt)}</time>
            </div>
          )
        })}
      </div>
      {error && <p className="room-error">{error}</p>}
      <form className="dm-form" onSubmit={submit}>
        <input
          className="input"
          value={text}
          maxLength={500}
          placeholder="쪽지 보내기"
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!text.trim() || busy}>
          보내기
        </button>
      </form>
    </div>
  )
}
