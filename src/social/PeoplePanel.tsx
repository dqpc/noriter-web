import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CharacterAvatar } from '../characters'
import { findGame } from '../games/registry'
import { useAuth } from '../auth/useAuth'
import {
  describeActivity,
  fetchFriends,
  lookupNickname,
  PRESENCE_LABEL,
  type Friend,
  type Presence,
  type PresenceState,
  type Profile,
} from '../lib/auth'
import { PresenceDot } from './PresenceDot'
import { ProfileCard } from './ProfileCard'

const STATUS_OPTIONS: { value: Presence; state: PresenceState; label: string; desc: string }[] = [
  { value: 'ONLINE', state: 'ONLINE', label: '온라인', desc: '평소처럼 보임' },
  { value: 'AWAY', state: 'AWAY', label: '자리 비움', desc: '자리 비움으로 보임. 초대는 받음' },
  { value: 'BUSY', state: 'BUSY', label: '바쁨', desc: '바쁨으로 보임. 초대를 받지 않음' },
  { value: 'INVISIBLE', state: 'OFFLINE', label: '숨김', desc: '항상 오프라인으로 보임' },
]

const POLL_MS = 20_000

export function PeoplePanel({ onClose }: { onClose: () => void }) {
  const { me, setPresence } = useAuth()
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [tab, setTab] = useState<'online' | 'all'>('online')
  const [query, setQuery] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [profile, setProfile] = useState<number | null>(null)
  const [found, setFound] = useState<Profile | null | undefined>(undefined)
  const [searching, setSearching] = useState(false)

  const load = () =>
    fetchFriends()
      .then(setFriends)
      .catch(() => setFriends((f) => f ?? []))
  useEffect(() => {
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(id)
  }, [])

  const myState = STATUS_OPTIONS.find((o) => o.value === me?.presence) ?? STATUS_OPTIONS[0]
  const q = query.trim().toLowerCase()
  const shown = (friends ?? [])
    .filter((f) => tab === 'all' || f.presence.state !== 'OFFLINE')
    .filter((f) => !q || f.nickname.toLowerCase().includes(q))
  const onlineCount = (friends ?? []).filter((f) => f.presence.state !== 'OFFLINE').length

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="panel people" onClick={(e) => e.stopPropagation()} aria-label="사람들">
        <div className="panel-head">
          <span className="panel-title">사람들</span>
          <button type="button" className="status-btn" onClick={() => setChoosing(true)}>
            {myState.label} <PresenceDot state={myState.state} />
          </button>
          <button type="button" className="panel-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <form
          className="panel-find"
          onSubmit={async (e) => {
            e.preventDefault()
            const name = query.trim()
            if (!name) return
            setSearching(true)
            try {
              setFound(await lookupNickname(name))
            } catch {
              setFound(null)
            } finally {
              setSearching(false)
            }
          }}
        >
          <input
            className="input panel-search"
            placeholder="닉네임 (친구 목록 검색 · Enter 로 사용자 찾기)"
            value={query}
            autoCapitalize="none"
            onChange={(e) => {
              setQuery(e.target.value)
              setFound(undefined)
            }}
          />
          <button type="submit" className="btn btn-small" disabled={!query.trim() || searching}>
            찾기
          </button>
        </form>
        {found !== undefined && (
          <div className="people-found">
            {found === null ? (
              <span className="room-hint">
                '{query.trim()}' 닉네임의 사용자가 없어요. 정확한 닉네임을 입력해 주세요.
              </span>
            ) : found.id === me?.id ? (
              <span className="room-hint">나 자신이에요.</span>
            ) : (
              <button type="button" className="people-main" onClick={() => setProfile(found.id)}>
                <CharacterAvatar id={found.characterId} size={32} />
                <span className="people-text">
                  <b>{found.nickname}</b>
                  <small>
                    <PresenceDot state={found.presence.state} size={8} /> {describeActivity(found.presence)}
                    {found.friend ? ' · 이미 친구' : ' · 눌러서 프로필 보기·친구 추가'}
                  </small>
                </span>
              </button>
            )}
          </div>
        )}
        <div className="panel-tabs">
          <button type="button" className={tab === 'online' ? 'active' : ''} onClick={() => setTab('online')}>
            온라인 {onlineCount > 0 && <small>{onlineCount}</small>}
          </button>
          <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
            전체 {friends && friends.length > 0 && <small>{friends.length}</small>}
          </button>
        </div>
        <ul className="people-list">
          {friends === null && <li className="room-hint">불러오는 중…</li>}
          {friends !== null && shown.length === 0 && (
            <li className="room-hint">
              {friends.length === 0
                ? '아직 친구가 없어요. 대기실에서 같이 노는 사람의 프로필을 열어 추가해 보세요.'
                : tab === 'online'
                  ? '지금 접속한 친구가 없어요.'
                  : '검색 결과가 없어요.'}
            </li>
          )}
          {shown.map((f) => {
            const game = f.presence.gameId ? findGame(f.presence.gameId)?.name : undefined
            const joinable = f.presence.activity === 'LOBBY' && f.presence.roomId
            return (
              <li key={f.id} className={`people-row ${f.presence.state.toLowerCase()}`}>
                <button type="button" className="people-main" onClick={() => setProfile(f.id)}>
                  <CharacterAvatar id={f.characterId} size={32} />
                  <span className="people-text">
                    <b>{f.nickname}</b>
                    <small>
                      <PresenceDot state={f.presence.state} size={8} /> {describeActivity(f.presence, game)}
                      {f.presence.state !== 'OFFLINE' &&
                        f.presence.state !== 'ONLINE' &&
                        ` · ${PRESENCE_LABEL[f.presence.state]}`}
                    </small>
                  </span>
                </button>
                {joinable && (
                  <Link to={`/rooms/${f.presence.roomId}`} className="btn btn-small" onClick={onClose}>
                    들어가기
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
        {choosing && (
          <div className="status-picker" onClick={() => setChoosing(false)}>
            <button type="button" className="btn btn-ghost btn-small status-back">
              뒤로
            </button>
            <ul onClick={(e) => e.stopPropagation()}>
              {STATUS_OPTIONS.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className={o.value === me?.presence ? 'selected' : ''}
                    onClick={() => {
                      setPresence(o.value).catch(() => {})
                      setChoosing(false)
                    }}
                  >
                    <PresenceDot state={o.state} size={14} />
                    <span>
                      <b>{o.label}</b>
                      <small>{o.desc}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      {profile !== null && (
        <ProfileCard
          userId={profile}
          onClose={() => setProfile(null)}
          onChanged={() => {
            load()
            if (found) setFound({ ...found, friend: !found.friend })
          }}
        />
      )}
    </div>
  )
}
