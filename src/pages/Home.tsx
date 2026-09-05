import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CharacterAvatar, CharacterPicker, findCharacter, getMyCharacter, setMyCharacter } from '../characters'
import { GAMES } from '../games/registry'
import { fetchRoom, type RoomSnapshot } from '../lib/roomClient'
import { forgetRoom, getBestScore, getPlayerToken, getRememberedRooms } from '../lib/storage'

export function Home() {
  const [me, setMe] = useState(getMyCharacter)
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
          <p className="page-sub">가볍게 한판. 로그인 없이 바로 시작.</p>
        </div>
        <button type="button" className="me-button" onClick={() => setPicking(true)} aria-label="캐릭터 선택">
          <CharacterAvatar id={me} size={56} />
          <span>{findCharacter(me).name}</span>
        </button>
      </div>
      {picking && (
        <CharacterPicker
          value={me}
          onChange={(id) => {
            setMyCharacter(id)
            setMe(id)
          }}
          onClose={() => setPicking(false)}
        />
      )}
      <ul className="game-list">
        {GAMES.map((g) => (
          <li key={g.id}>
            <Link to={`/games/${g.id}`} className="game-card">
              <span className="game-card-text">
                <span className="game-card-name">{g.name}</span>
                <span className="game-card-desc">{g.description}</span>
                <span className="game-card-best">최고 {getBestScore(g.id)}</span>
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
