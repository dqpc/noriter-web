import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CharacterAvatar, CharacterPicker, findCharacter, getMyCharacter } from '../characters'
import { useActivity, useAuth } from '../auth/useAuth'
import { Gate } from '../auth/Gate'
import { GAMES } from '../games/registry'
import { fetchRoom, type RoomSnapshot } from '../lib/roomClient'
import { forgetRoom, getBestScore, getPlayerToken, getRememberedRooms } from '../lib/storage'

export function Home() {
  const auth = useAuth()
  const [picked, setPicked] = useState(getMyCharacter)
  const me = auth.me?.characterId ?? picked
  useActivity('MENU')
  const [picking, setPicking] = useState(false)
  const [resumable, setResumable] = useState<Record<string, RoomSnapshot>>({})
  useEffect(() => {
    let cancelled = false
    const token = getPlayerToken()
    Promise.all(
      getRememberedRooms().map(async (r) => {
        const snap = await fetchRoom(r.roomId).catch(() => undefined)
        if (snap === undefined) return null
        if (!snap || snap.status === 'FINISHED' || !snap.players.some((p) => p.id === token)) {
          forgetRoom(r.roomId)
          return null
        }
        return snap
      }),
    ).then((rooms) => {
      if (cancelled) return
      const next: Record<string, RoomSnapshot> = {}
      for (const r of rooms) if (r && !next[r.gameId]) next[r.gameId] = r
      setResumable(next)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return (
    <section className="page">
      <div className="home-head">
        <div>
          <h1 className="page-title">놀이터</h1>
          <p className="page-sub">에서 가볍게 한 판</p>
        </div>
        {auth.identified && (
          <div className="home-me">
            <button type="button" className="me-button" onClick={() => setPicking(true)} aria-label="캐릭터 선택">
              <CharacterAvatar id={me} size={56} />
              <span>{findCharacter(me).name}</span>
            </button>
            <span className="home-who">
              <b>{auth.displayName}</b>
              {auth.me ? (
                <button type="button" className="link-btn" onClick={auth.signOut}>
                  로그아웃
                </button>
              ) : (
                <>
                  <small>게스트</small>
                  <button type="button" className="link-btn" onClick={() => auth.playAsGuest('')}>
                    로그인·가입
                  </button>
                </>
              )}
            </span>
          </div>
        )}
      </div>
      {auth.me === undefined ? (
        <p className="room-hint">로그인 확인 중…</p>
      ) : (
        !auth.identified && <Gate onPick={() => setPicking(true)} />
      )}
      {picking && (
        <CharacterPicker
          value={me}
          onChange={(id) => {
            auth.changeCharacter(id)
            setPicked(id)
          }}
          onClose={() => setPicking(false)}
        />
      )}
      <ul className={`game-list ${auth.identified ? '' : 'dimmed'}`}>
        {GAMES.map((g) => (
          <li key={g.id}>
            <Link to={`/games/${g.id}`} className="game-card">
              <span className="game-card-text">
                <span className="game-card-name">{g.name}</span>
                <span className="game-card-desc">{g.description}</span>
                {!g.turnBased && !g.solo && <span className="game-card-best">최고 {getBestScore(g.id)}</span>}
              </span>
              <span className="game-card-icon">
                <g.Icon size={60} />
              </span>
            </Link>
            {resumable[g.id] && (
              <Link to={`/rooms/${resumable[g.id].id}`} className="game-resume">
                <i className="game-resume-dot" />
                {resumable[g.id].status === 'WAITING' ? '대기 중인 방이 있어요' : '진행 중인 판이 있어요'}
                <span className="game-resume-cta">다시 들어가기 →</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
