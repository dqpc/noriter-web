import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CharacterAvatar, CharacterPicker, findCharacter, getMyCharacter, setMyCharacter } from '../characters'
import type { GameDefinition, GameHost } from '../games/types'
import { findGame } from '../games/registry'
import {
  RoomSocket,
  fetchRoom,
  type ChatMessage,
  type OptionValue,
  type PlayerSnapshot,
  type RoomSnapshot,
  type RoomStatus,
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
  const [room, setRoom] = useState<RoomSnapshot | null | undefined>(undefined)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState(() => getPreference('room', 'nickname') ?? '')
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] = useState<'connecting' | 'open' | 'reconnecting' | 'closed'>('connecting')
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [character, setCharacter] = useState(getMyCharacter)
  const [picking, setPicking] = useState(false)
  const [others, setOthers] = useState<Record<string, Record<string, unknown>>>({})
  const [watching, setWatching] = useState<string | null>(null)
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null)
  const socketRef = useRef<RoomSocket | null>(null)
  const statusRef = useRef<RoomStatus | null>(null)

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
      onOpen: () => {
        setConnection('open')
        socket.send({ type: 'join', nickname: name, character })
      },
      onReconnecting: () => setConnection('reconnecting'),
      onMessage: (m) => {
        if (m.type === 'hello') setPlayerId(m.playerId)
        else if (m.type === 'room') {
          statusRef.current = m.room.status
          setRoom(m.room)
          setError(null)
          if (m.room.status === 'WAITING' || m.room.status === 'COUNTDOWN') {
            setOthers({})
            setWatching(null)
            setGameState(null)
          }
        } else if (m.type === 'playerState') setOthers((prev) => ({ ...prev, [m.playerId]: m.state }))
        else if (m.type === 'gameState') setGameState(m.state)
        else if (m.type === 'chat') setChat((prev) => [...prev.slice(-99), m.message])
        else if (m.type === 'chatHistory') setChat(m.messages)
        else if (m.type === 'error') setError(m.message)
      },
      onClose: () => setConnection('closed'),
    })
    socketRef.current = socket
    setJoined(true)
  }

  const send = useCallback((msg: Parameters<RoomSocket['send']>[0]) => socketRef.current?.send(msg), [])

  const changeCharacter = (id: string) => {
    setMyCharacter(id)
    setCharacter(id)
    if (joined) send({ type: 'character', character: id })
  }

  const sendAction = useCallback((action: Record<string, unknown>) => send({ type: 'action', action }), [send])

  const host = useMemo<GameHost>(
    () => ({
      onScore: (score) => statusRef.current === 'PLAYING' && send({ type: 'score', score }),
      onGameOver: (score) => statusRef.current === 'PLAYING' && send({ type: 'finish', score }),
      onState: (state) => statusRef.current === 'PLAYING' && send({ type: 'state', state }),
    }),
    [send],
  )

  const cycle = useCallback(
    (dir: number) => {
      if (!room || !playerId) return
      const list = room.players.filter((p) => p.id !== playerId && !p.finished)
      if (list.length === 0) return
      setWatching((cur) => {
        const i = Math.max(
          0,
          list.findIndex((p) => p.id === cur),
        )
        return list[(i + dir + list.length) % list.length].id
      })
    },
    [room, playerId],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') cycle(-1)
      else if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cycle])

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
  const otherPlayers = room.players.filter((p) => p.id !== playerId)
  const inGame = room.status === 'COUNTDOWN' || room.status === 'PLAYING' || room.status === 'FINISHED'
  const turnBased = room.game.turnBased && Boolean(game?.Turn)
  const playing = otherPlayers.filter((p) => !p.finished)
  const spectating = Boolean(me?.finished) && playing.length > 0
  const watchTarget = playing.find((p) => p.id === watching) ?? playing[0] ?? null
  const countdownLeft = Math.max(0, Math.ceil((new Date(room.startAt ?? 0).getTime() - now) / 1000))
  const ranked = [...room.players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.score - a.score)

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
            <button
              type="button"
              className="me-button me-inline"
              onClick={() => setPicking(true)}
              aria-label="캐릭터 선택"
            >
              <CharacterAvatar id={character} size={44} />
              <span>{findCharacter(character).name}</span>
            </button>
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
        {picking && <CharacterPicker value={character} onChange={changeCharacter} onClose={() => setPicking(false)} />}
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
        <button type="button" className="play-best room-me" onClick={() => setPicking(true)} aria-label="캐릭터 변경">
          <CharacterAvatar id={me?.character ?? character} size={28} /> {me?.nickname ?? nickname}
        </button>
      </div>
      {picking && <CharacterPicker value={character} onChange={changeCharacter} onClose={() => setPicking(false)} />}
      {error && <p className="room-error">{error}</p>}
      {connection === 'reconnecting' && <p className="room-hint">연결이 끊겨 다시 붙는 중…</p>}
      {connection === 'closed' && <p className="room-error">방이 없어졌습니다. 목록으로 돌아가 주세요.</p>}

      {room.status === 'WAITING' && (
        <div className="room-layout fade-in">
          <Lobby room={room} isHost={isHost} me={playerId} send={send} onPick={() => setPicking(true)} />
          <Chat messages={chat} me={playerId} onSend={(text) => send({ type: 'chat', text })} />
        </div>
      )}

      {inGame && game && (
        <div className="room-live fade-in">
          {inGame && (
            <div className="room-live-chat">
              <Chat messages={chat} me={playerId} onSend={(text) => send({ type: 'chat', text })} compact />
            </div>
          )}
          <div className="room-play">
            <div className="room-timer">
              {room.status === 'PLAYING' && room.endAt
                ? `남은 시간 ${formatDuration(Math.max(0, new Date(room.endAt).getTime() - now))}`
                : room.status === 'FINISHED'
                  ? '종료'
                  : room.status === 'COUNTDOWN'
                    ? '준비'
                    : ''}
            </div>
            <div className="stage">
              {turnBased && game.Turn ? (
                gameState ? (
                  <game.Turn view={gameState} me={playerId} players={room.players} onAction={sendAction} />
                ) : (
                  <p className="room-hint">판을 준비하는 중…</p>
                )
              ) : room.status !== 'COUNTDOWN' && spectating && watchTarget ? (
                <Spectate
                  game={game}
                  room={room}
                  target={watchTarget}
                  state={others[watchTarget.id]}
                  canCycle={playing.length > 1}
                  onPrev={() => cycle(-1)}
                  onNext={() => cycle(1)}
                />
              ) : game.Component ? (
                <game.Component
                  key={room.seed}
                  host={host}
                  options={{
                    ...room.options,
                    seed: room.seed,
                    character: me?.character ?? character,
                    frozen: room.status !== 'PLAYING',
                  }}
                />
              ) : null}
              {room.status === 'COUNTDOWN' && (
                <div className="stage-overlay countdown">
                  <span key={countdownLeft} className="countdown-num">
                    {countdownLeft}
                  </span>
                </div>
              )}
              {room.status === 'FINISHED' && (
                <div className="stage-overlay results">
                  <div className="results-panel">
                    <p className="results-title">결과</p>
                    <ol className="results-list">
                      {ranked.map((p, i) => (
                        <li
                          key={p.id}
                          className={p.id === playerId ? 'me' : ''}
                          style={{ animationDelay: `${0.35 + i * 0.12}s` }}
                        >
                          <span className="room-rank">{p.rank ?? i + 1}등</span>
                          <span className="room-name">
                            <CharacterAvatar id={p.character} size={24} /> {p.nickname}
                          </span>
                          <span className="room-score">{p.score}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="room-actions">
                      {isHost ? (
                        <button type="button" className="btn" onClick={() => send({ type: 'rematch' })}>
                          다시 하기
                        </button>
                      ) : (
                        <p className="room-hint">방장이 다시 하기를 누르면 바로 다시 시작합니다.</p>
                      )}
                      <Link to="/" className="btn btn-ghost">
                        나가기
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!turnBased && room.status !== 'FINISHED' && (
              <Scoreboard players={room.players} me={playerId} finished={false} />
            )}
          </div>
          {!turnBased && room.status !== 'WAITING' && otherPlayers.length > 0 && (
            <div className="room-others">
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={p.id === watchTarget?.id && spectating ? 'room-other selected' : 'room-other'}
                  onClick={() => spectating && !p.finished && setWatching(p.id)}
                >
                  <span className="room-other-head">
                    <CharacterAvatar id={p.character} size={18} /> {p.nickname}
                    <b>{p.score}</b>
                    {p.finished && <span className="room-done"> 완료</span>}
                  </span>
                  {others[p.id] && game.Preview ? (
                    <game.Preview
                      state={others[p.id]}
                      options={{ ...room.options, seed: room.seed }}
                      character={p.character}
                    />
                  ) : (
                    <span className="room-other-empty">대기 중</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Lobby({
  room,
  isHost,
  me,
  send,
  onPick,
}: {
  room: RoomSnapshot
  isHost: boolean
  me: string | null
  send: (m: Parameters<RoomSocket['send']>[0]) => void
  onPick: () => void
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
  const duplicate =
    room.game.uniqueCharacters && new Set(room.players.map((p) => p.character)).size < room.players.length
  const canStart = room.players.length >= room.game.minPlayers && !duplicate

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
          <li key={p.id} className="room-player">
            <CharacterAvatar id={p.character} size={32} />
            {p.nickname}
            {p.id === room.hostId && <span className="room-host-badge">방장</span>}
            {p.id === me && (
              <button type="button" className="btn btn-ghost btn-small" onClick={onPick}>
                바꾸기
              </button>
            )}
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
                  onClick={() =>
                    send({
                      type: 'settings',
                      options: { [key]: c as OptionValue },
                    })
                  }
                >
                  {optionValue(c)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {room.game.uniqueCharacters && duplicate && (
          <p className="room-error">이 게임은 캐릭터가 겹치면 안 됩니다. 이름 옆 바꾸기로 바꿔 주세요.</p>
        )}
        {room.game.matchDurationSeconds && (
          <p className="room-hint">제한 시간 {Math.round(room.game.matchDurationSeconds / 60)}분</p>
        )}
      </div>

      {isHost ? (
        <button type="button" className="btn room-start" disabled={!canStart} onClick={() => send({ type: 'start' })}>
          {canStart ? '시작' : duplicate ? '같은 캐릭터가 있어요' : `${room.game.minPlayers}명 이상 필요`}
        </button>
      ) : (
        <p className="room-hint">방장이 시작하기를 기다리는 중…</p>
      )}
    </div>
  )
}

const OPTION_LABELS: Record<string, string> = { target: '목표 타일' }
const OPTION_VALUES: Record<string, string> = { normal: '보통', fast: '빠름' }

function optionLabel(key: string): string {
  return OPTION_LABELS[key] ?? key
}

function optionValue(v: unknown): string {
  return OPTION_VALUES[String(v)] ?? String(v)
}

function Scoreboard({ players, me, finished }: { players: PlayerSnapshot[]; me: string | null; finished: boolean }) {
  const sorted = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.score - a.score)
  return (
    <ol className="room-scoreboard">
      {sorted.map((p, i) => (
        <li key={p.id} className={p.id === me ? 'me' : ''}>
          <span className="room-rank">{finished && p.rank ? `${p.rank}등` : `${i + 1}`}</span>
          <span className="room-name">
            <CharacterAvatar id={p.character} size={24} /> {p.nickname}
            {p.finished && !finished && <span className="room-done"> 완료</span>}
          </span>
          <span className="room-score">{p.score}</span>
        </li>
      ))}
    </ol>
  )
}

function Chat({
  messages,
  me,
  onSend,
  compact = false,
}: {
  messages: ChatMessage[]
  me: string | null
  onSend: (text: string) => void
  compact?: boolean
}) {
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
    <div className={compact ? 'chat chat-compact' : 'chat'}>
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

function Spectate({
  game,
  room,
  target,
  state,
  canCycle,
  onPrev,
  onNext,
}: {
  game: GameDefinition
  room: RoomSnapshot
  target: PlayerSnapshot
  state: Record<string, unknown> | undefined
  canCycle: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="spectate">
      <div className="spectate-bar">
        <button type="button" className="btn btn-ghost" onClick={onPrev} disabled={!canCycle} aria-label="이전 참가자">
          ◀
        </button>
        <span className="spectate-title">
          <CharacterAvatar id={target.character} size={24} /> {target.nickname} 관전 중 · {target.score}
        </span>
        <button type="button" className="btn btn-ghost" onClick={onNext} disabled={!canCycle} aria-label="다음 참가자">
          ▶
        </button>
      </div>
      <div className="spectate-view">
        {state && game.Preview ? (
          <game.Preview state={state} options={{ ...room.options, seed: room.seed }} character={target.character} />
        ) : (
          <p className="room-hint">아직 움직임이 없습니다.</p>
        )}
      </div>
      <p className="room-hint">← → 로 다른 참가자를 볼 수 있습니다.</p>
    </div>
  )
}
