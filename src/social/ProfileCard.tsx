import { useEffect, useState } from 'react'
import { CharacterAvatar } from '../characters'
import { findGame } from '../games/registry'
import { useAuth } from '../auth/useAuth'
import {
  addFriend,
  describeActivity,
  fetchProfile,
  fetchStats,
  removeFriend,
  type GameStats,
  type Profile,
} from '../lib/auth'
import { EnvelopeIcon } from './EnvelopeIcon'
import { PresenceDot } from './PresenceDot'

export function ProfileCard({
  userId,
  onClose,
  onChanged,
  onMessage,
}: {
  userId: number
  onClose: () => void
  onChanged?: () => void
  onMessage?: (userId: number) => void
}) {
  const { me } = useAuth()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [stats, setStats] = useState<GameStats[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProfile(userId), fetchStats(userId).catch(() => [] as GameStats[])])
      .then(([p, s]) => {
        if (cancelled) return
        setProfile(p)
        setStats(s)
      })
      .catch(() => !cancelled && setProfile(null))
    return () => {
      cancelled = true
    }
  }, [userId])

  const toggleFriend = async () => {
    if (!profile) return
    setBusy(true)
    try {
      if (profile.friend) await removeFriend(profile.id)
      else await addFriend(profile.id)
      setProfile({ ...profile, friend: !profile.friend })
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  const gameName = (id: string | null) => (id ? (findGame(id)?.name ?? id) : undefined)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal profile" onClick={(e) => e.stopPropagation()}>
        {profile === undefined && <p className="room-hint">불러오는 중…</p>}
        {profile === null && <p className="room-error">프로필을 불러오지 못했습니다.</p>}
        {profile && (
          <>
            <div className="profile-head">
              <CharacterAvatar id={profile.characterId} size={64} />
              <div className="profile-id">
                <b className="profile-name">{profile.nickname}</b>
                <span className="profile-presence">
                  <PresenceDot state={profile.presence.state} />
                  {describeActivity(profile.presence, gameName(profile.presence.gameId))}
                </span>
                <small className="profile-since">
                  {new Date(profile.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  가입
                </small>
              </div>
            </div>
            {stats.length > 0 ? (
              <table className="profile-stats">
                <thead>
                  <tr>
                    <th>게임</th>
                    <th>판</th>
                    <th>기록</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.gameId}>
                      <td>{findGame(s.gameId)?.name ?? s.gameName}</td>
                      <td>{s.plays}</td>
                      <td>{s.turnBased ? `1등 ${s.wins}번` : s.best !== null ? `최고 ${s.best}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="room-hint">아직 같이 한 판 기록이 없어요.</p>
            )}
            <div className="profile-actions">
              {me && me.id !== profile.id && onMessage && profile.friend && (
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => onMessage(profile.id)}
                  title="쪽지 보내기"
                >
                  <EnvelopeIcon /> 쪽지
                </button>
              )}
              {me && me.id !== profile.id && (
                <button
                  type="button"
                  className={`btn ${profile.friend ? 'btn-ghost' : ''}`}
                  onClick={toggleFriend}
                  disabled={busy}
                >
                  {profile.friend ? '친구 삭제' : '친구 추가'}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                닫기
              </button>
            </div>
            {me && me.id !== profile.id && !profile.friend && (
              <p className="profile-note">친구 추가는 나만 알 수 있어요. 상대에게 알림이 가지 않습니다.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
