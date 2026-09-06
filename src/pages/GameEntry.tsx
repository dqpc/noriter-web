import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { findGame } from '../games/registry'
import { createRoom, fetchRoom } from '../lib/roomClient'
import { getBestScore } from '../lib/storage'

export function GameEntry() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = findGame(gameId)
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState<string | null>(null)

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

  const findRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = code.trim().toLowerCase()
    if (id.length !== 8) return
    setFinding(true)
    setFindError(null)
    try {
      const room = await fetchRoom(id)
      if (!room) setFindError('그 코드의 방이 없습니다.')
      else if (room.status !== 'WAITING') setFindError('이미 시작된 방입니다.')
      else if (room.players.length >= room.maxPlayers) setFindError('방이 가득 찼습니다.')
      else navigate(`/rooms/${room.id}`)
    } catch (err) {
      setFindError(err instanceof Error ? err.message : '방을 찾지 못했습니다.')
    } finally {
      setFinding(false)
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
        {!game.turnBased && !game.solo && <p className="game-card-best">최고 {getBestScore(game.id)}</p>}
      </div>
      {game.solo ? (
        <div className="entry-actions">
          <Link to={`/games/${game.id}/play`} className="btn entry-btn">
            시작
          </Link>
        </div>
      ) : (
        <>
          <div className="entry-actions">
            {game.Component && (
              <Link to={`/games/${game.id}/play`} className="btn entry-btn">
                혼자 하기
              </Link>
            )}
            <button type="button" className="btn btn-ghost entry-btn" onClick={together} disabled={creating}>
              같이 하기
            </button>
          </div>
          <p className="room-hint">같이 하기는 방을 만들고 초대 링크로 친구를 부릅니다.</p>
        </>
      )}
      {!game.solo && (
        <form className="entry-find" onSubmit={findRoom}>
          <span className="entry-find-label">방 찾기</span>
          <input
            className="input mono"
            value={code}
            maxLength={4}
            placeholder="방 코드 4자"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^a-z0-9]/gi, ''))
              setFindError(null)
            }}
          />
          <button type="submit" className="btn btn-ghost" disabled={code.trim().length !== 8 || finding}>
            입장
          </button>
        </form>
      )}
      {findError && <p className="room-error">{findError}</p>}
    </section>
  )
}
