import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { GameHost } from '../games/types'
import { findGame } from '../games/registry'
import {
  RoomSocket,
  createRoom,
  fetchRoom,
  type ChatMessage,
  type OptionValue,
  type PlayerSnapshot,
  type RoomSnapshot,
} from '../lib/roomClient'
import { getPreference, setPreference } from '../lib/storage'
import { formatDuration } from '../lib/time'

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

export function Room() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomSnapshot | null | undefined>(undefined)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState(() => getPreference('room', 'nickname') ?? '')
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnected, setDisconnected] = useState(false)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const socketRef = useRef<RoomSocket | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchRoom(roomId)
      .then((r) => !cancelled && setRoom(r))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [roomId])

  useEffect(() => () => socketRef.current?.close(), [])

  const join = (e: React.FormEvent) => {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) return
    setPreference('room', 'nickname', name)
    const socket = new RoomSocket(roomId, {
      onMessage: (m) => {
        if (m.type === 'hello') setPlayerId(m.playerId)
        else if (m.type === 'room') setRoom(m.room)
        else if (m.type === 'chat') setChat((prev) => [...prev.slice(-99), m.message])
        else if (m.type === 'chatHistory') setChat(m.messages)
        else setError(m.message)
      },
      onClose: () => setDisconnected(true),
    })
    socket.send({ type: 'join', nickname: name })
    socketRef.current = socket
    setJoined(true)
  }

  const send = useCallback((msg: Parameters<RoomSocket['send']>[0]) => socketRef.current?.send(msg), [])

  const host = useMemo<GameHost>(
    () => ({
      onScore: (score) => send({ type: 'score', score }),
      onGameOver: (score) => send({ type: 'finish', score }),
    }),
    [send],
  )

  const isPlaying = room?.status === 'PLAYING' || room?.status === 'COUNTDOWN'
  const now = useNow(isPlaying)

  if (error && !room) {
    return (
      <section className="page">
        <p>{error}</p>
        <Link to="/" className="btn">
          목록으로
        </Link>
      </section>
    )
  }
  if (room === undefined) return <section className="page">불러오는 중…</section>
  if (room === null) {
    return (
      <section className="page">
        <p>없는 방이거나 이미 끝난 방입니다.</p>
        <Link to="/" className="btn">
          목록으로
        </Link>
      </section>
    )
  }

  const game = findGame(room.gameId)
  const me = room.players.find((p) => p.id === playerId)
  const isHost = playerId !== null && room.hostId === playerId

  if (!joined) {
    const full = room.players.length >= room.maxPlayers
    const started = room.status !== 'WAITING'
    return (
      <section className="page">
        <h1 className="page-title">{room.game.name} 함께 하기</h1>
        <p className="page-sub">
          {room.players.length}/{room.maxPlayers} 명 · {started ? '이미 시작됨' : '대기 중'}
        </p>
        {started || full ? (
          <p>{started ? '이미 시작된 방입니다.' : '방이 가득 찼습니다.'}</p>
        ) : (
          <form className="room-join" onSubmit={join}>
            <input
              className="input"
              value={nickname}
              maxLength={12}
              placeholder="닉네임"
              autoFocus
              onChange={(e) => setNickname(e.target.value)}
            />
            <button type="submit" className="btn" disabled={!nickname.trim()}>
              입장
            </button>
          </form>
        )}
      </section>
    )
  }

  return (
    <section className="page room">
      <div className="play-bar">
        <Link to="/" className="play-back" aria-label="목록으로">
          ←
        </Link>
        <span className="play-title">{room.game.name}</span>
        <span className="play-best">{me?.nickname ?? nickname}</span>
      </div>
      {error && <p className="room-error">{error}</p>}
      {disconnected && <p className="room-error">연결이 끊어졌습니다. 새로고침해 주세요.</p>}

      {room.status === 'WAITING' && (
        <>
          <Lobby room={room} isHost={isHost} send={send} />
          <Chat messages={chat} me={playerId} onSend={(text) => send({ type: 'chat', text })} />
        </>
      )}

      {room.status === 'COUNTDOWN' && (
        <div className="room-countdown">
          <p>곧 시작합니다</p>
          <p className="room-countdown-num">
            {Math.max(0, Math.ceil((new Date(room.startAt ?? 0).getTime() - now) / 1000))}
          </p>
        </div>
      )}

      {(room.status === 'PLAYING' || room.status === 'FINISHED') && game && (
        <div className="room-play">
          <div className="room-timer">
            {room.status === 'PLAYING' && room.endAt
              ? `남은 시간 ${formatDuration(Math.max(0, new Date(room.endAt).getTime() - now))}`
              : room.status === 'FINISHED'
                ? '종료'
                : ''}
          </div>
          <game.Component host={host} options={{ ...room.options, seed: room.seed }} />
          <Scoreboard players={room.players} me={playerId} finished={room.status === 'FINISHED'} />
          {room.status === 'FINISHED' && (
            <div className="room-actions">
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const next = await createRoom(room.gameId)
                  socketRef.current?.close()
                  navigate(`/rooms/${next.id}`)
                  window.location.reload()
                }}
              >
                새 방 만들기
              </button>
              <Link to="/" className="btn btn-ghost">
                목록으로
              </Link>
            </div>
          )}
          {room.status === 'FINISHED' && (
            <Chat messages={chat} me={playerId} onSend={(text) => send({ type: 'chat', text })} />
          )}
        </div>
      )}
    </section>
  )
}

function Lobby({
  room,
  isHost,
  send,
}: {
  room: RoomSnapshot
  isHost: boolean
  send: (m: Parameters<RoomSocket['send']>[0]) => void
}) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${window.location.origin}/rooms/${room.id}`
  const canShare = typeof navigator.share === 'function'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('초대 링크', inviteUrl)
    }
  }
  const share = () => navigator.share({ title: `${room.game.name} 함께 하기`, url: inviteUrl }).catch(() => {})
  const maxRange = Array.from(
    { length: room.game.maxPlayersLimit - room.game.minPlayers + 1 },
    (_, i) => room.game.minPlayers + i,
  )
  const canStart = room.players.length >= room.game.minPlayers

  return (
    <div className="room-lobby">
      <div className="room-invite">
        <code className="room-invite-url">{inviteUrl}</code>
        <div className="room-invite-actions">
          <button type="button" className="btn btn-ghost" onClick={copy}>
            {copied ? '복사됨' : '링크 복사'}
          </button>
          {canShare && (
            <button type="button" className="btn btn-ghost" onClick={share}>
              공유
            </button>
          )}
        </div>
      </div>

      <ul className="room-players">
        {room.players.map((p) => (
          <li key={p.id}>
            {p.nickname}
            {p.id === room.hostId && <span className="room-host-badge">방장</span>}
          </li>
        ))}
        {Array.from({ length: room.maxPlayers - room.players.length }, (_, i) => (
          <li key={`empty-${i}`} className="room-player-empty">
            빈 자리
          </li>
        ))}
      </ul>

      <div className="room-settings">
        <label>
          최대 인원
          <select
            className="input"
            value={room.maxPlayers}
            disabled={!isHost}
            onChange={(e) => send({ type: 'settings', maxPlayers: Number(e.target.value) })}
          >
            {maxRange.map((n) => (
              <option key={n} value={n} disabled={n < room.players.length}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {Object.entries(room.game.optionChoices).map(([key, choices]) => (
          <div key={key} className="room-option">
            <span>{optionLabel(key)}</span>
            <div className="g2048-targets">
              {choices.map((c) => (
                <button
                  key={String(c)}
                  type="button"
                  className={String(room.options[key]) === String(c) ? 'btn' : 'btn btn-ghost'}
                  disabled={!isHost}
                  onClick={() => send({ type: 'settings', options: { [key]: c as OptionValue } })}
                >
                  {String(c)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {room.game.matchDurationSeconds && (
          <p className="room-hint">제한 시간 {Math.round(room.game.matchDurationSeconds / 60)}분</p>
        )}
      </div>

      {isHost ? (
        <button type="button" className="btn room-start" disabled={!canStart} onClick={() => send({ type: 'start' })}>
          {canStart ? '시작' : `${room.game.minPlayers}명 이상 필요`}
        </button>
      ) : (
        <p className="room-hint">방장이 시작하기를 기다리는 중…</p>
      )}
    </div>
  )
}

function optionLabel(key: string): string {
  return key === 'target' ? '목표 타일' : key
}

function Scoreboard({ players, me, finished }: { players: PlayerSnapshot[]; me: string | null; finished: boolean }) {
  const sorted = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.score - a.score)
  return (
    <ol className="room-scoreboard">
      {sorted.map((p, i) => (
        <li key={p.id} className={p.id === me ? 'me' : ''}>
          <span className="room-rank">{finished && p.rank ? `${p.rank}등` : `${i + 1}`}</span>
          <span className="room-name">
            {p.nickname}
            {p.finished && !finished && <span className="room-done"> 완료</span>}
          </span>
          <span className="room-score">{p.score}</span>
        </li>
      ))}
    </ol>
  )
}

function Chat({ messages, me, onSend }: { messages: ChatMessage[]; me: string | null; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="room-hint">아직 대화가 없습니다.</p>}
        {messages.map((m, i) =>
          m.system ? (
            <p key={i} className="chat-system">
              {m.text}
            </p>
          ) : (
            <p key={i} className={m.playerId === me ? 'chat-msg me' : 'chat-msg'}>
              <span className="chat-name">{m.nickname}</span>
              <span className="chat-text">{m.text}</span>
            </p>
          ),
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          className="input"
          value={text}
          maxLength={200}
          placeholder="메시지"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!text.trim()}>
          보내기
        </button>
      </form>
    </div>
  )
}
