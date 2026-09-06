import { useEffect, useState } from 'react'
import { CharacterAvatar } from '../characters'
import { findGame } from '../games/registry'
import { describeActivity, fetchFriends, inviteToRoom, type Friend } from '../lib/auth'
import { PresenceDot } from './PresenceDot'

/** 대기실에서 친구 초대. 온라인·자리 비움인 친구만 초대 버튼이 살아 있다 */
export function InviteDialog({
  roomId,
  inRoom,
  onClose,
}: {
  roomId: string
  inRoom: Set<number>
  onClose: () => void
}) {
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [sent, setSent] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchFriends()
        .then((f) => !cancelled && setFriends(f))
        .catch(() => !cancelled && setFriends([]))
    load()
    const id = window.setInterval(load, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const invite = async (f: Friend) => {
    setBusy(f.id)
    setError(null)
    try {
      await inviteToRoom(roomId, f.id)
      setSent((s) => new Set(s).add(f.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '초대하지 못했습니다')
    } finally {
      setBusy(null)
    }
  }

  const sorted = [...(friends ?? [])].sort(
    (a, b) => Number(b.presence.state !== 'OFFLINE') - Number(a.presence.state !== 'OFFLINE'),
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal invite" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">친구 초대</p>
        <p className="room-hint">접속 중인 친구에게 알림이 갑니다. 수락하면 바로 이 방으로 들어와요.</p>
        <ul className="invite-list">
          {friends === null && <li className="room-hint">불러오는 중…</li>}
          {friends !== null && friends.length === 0 && (
            <li className="room-hint">친구가 없어요. 프로필에서 친구를 추가해 보세요.</li>
          )}
          {sorted.map((f) => {
            const game = f.presence.gameId ? findGame(f.presence.gameId)?.name : undefined
            const here = inRoom.has(f.id)
            const can = f.presence.state === 'ONLINE' || f.presence.state === 'AWAY'
            return (
              <li key={f.id} className={`invite-row ${can ? '' : 'off'}`}>
                <CharacterAvatar id={f.characterId} size={30} />
                <span className="people-text">
                  <b>{f.nickname}</b>
                  <small>
                    <PresenceDot state={f.presence.state} size={8} />{' '}
                    {f.presence.state === 'BUSY' ? '바쁨' : describeActivity(f.presence, game)}
                  </small>
                </span>
                {here ? (
                  <span className="invite-state">이미 방에</span>
                ) : sent.has(f.id) ? (
                  <span className="invite-state">초대함</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={!can || busy === f.id}
                    onClick={() => invite(f)}
                  >
                    초대
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {error && <p className="room-error">{error}</p>}
        <div className="profile-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
