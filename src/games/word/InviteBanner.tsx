import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { CharacterAvatar } from '../../characters'
import { addFriend, fetchProfile, type Profile } from '../../lib/auth'

/** 카톡 카드로 들어온 사람에게 보낸 사람을 친구로 권하는 한 줄 배너 */
export function InviteBanner({
  inviterId,
  onDone,
  onToast,
}: {
  inviterId: number
  /** 처리 끝(친구 추가·닫기·대상 아님). 다시 띄우지 않는다 */
  onDone: () => void
  onToast: (message: string) => void
}) {
  const auth = useAuth()
  const meId = auth.me?.id ?? null
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProfile(inviterId)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => !cancelled && setProfile(null))
    return () => {
      cancelled = true
    }
  }, [inviterId, meId])

  // 없는 사람·본인·이미 친구면 조용히 끝낸다
  useEffect(() => {
    if (profile === undefined) return
    if (profile === null || profile.id === meId || profile.friend) onDone()
  }, [profile, meId, onDone])

  if (!profile || profile.id === meId || profile.friend) return null

  const add = async () => {
    setBusy(true)
    try {
      await addFriend(profile.id)
      onToast(`${profile.nickname} 님과 친구가 됐어요.`)
      onDone()
    } catch {
      onToast('친구 추가에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="word-invite" role="status">
      <CharacterAvatar id={profile.characterId} size={32} />
      <span className="word-invite-text">
        <b>{profile.nickname}</b> 님이 보낸 글딱지예요.
        {!meId && ' 가입하면 친구로 추가할 수 있어요.'}
      </span>
      {meId ? (
        <button type="button" className="btn" onClick={add} disabled={busy}>
          친구 추가
        </button>
      ) : (
        <button type="button" className="btn" onClick={() => auth.playAsGuest('')}>
          가입하기
        </button>
      )}
      <button type="button" className="icon-btn" aria-label="닫기" onClick={onDone}>
        ✕
      </button>
    </div>
  )
}
