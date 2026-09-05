import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { findGame } from '../games/registry'
import { createRoom } from '../lib/roomClient'
import { getBestScore } from '../lib/storage'

export function GameEntry() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = findGame(gameId)
  const [creating, setCreating] = useState(false)

  if (!game) {
    return (
      <section className="page">
        <p>없는 게임입니다.</p>
        <Link to="/" className="btn">
          목록으로
        </Link>
      </section>
    )
  }

  const together = async () => {
    setCreating(true)
    try {
      const room = await createRoom(game.id)
      navigate(`/rooms/${room.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : '방을 만들지 못했습니다')
      setCreating(false)
    }
  }

  return (
    <section className="page entry">
      <div className="play-bar">
        <Link to="/" className="play-back" aria-label="목록으로">
          ←
        </Link>
        <span className="play-title">{game.name}</span>
      </div>
      <div className="entry-hero">
        <game.Icon size={96} />
        <p className="entry-desc">{game.description}</p>
        <p className="game-card-best">최고 {getBestScore(game.id)}</p>
      </div>
      <div className="entry-actions">
        <Link to={`/games/${game.id}/play`} className="btn entry-btn">
          혼자 하기
        </Link>
        <button type="button" className="btn btn-ghost entry-btn" onClick={together} disabled={creating}>
          같이 하기
        </button>
      </div>
      <p className="room-hint">같이 하기는 방을 만들고 초대 링크로 친구를 부릅니다.</p>
    </section>
  )
}
