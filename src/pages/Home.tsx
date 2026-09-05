import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CharacterAvatar, CharacterPicker, findCharacter, getMyCharacter, setMyCharacter } from '../characters'
import { GAMES } from '../games/registry'
import { getBestScore } from '../lib/storage'

export function Home() {
  const [me, setMe] = useState(getMyCharacter)
  const [picking, setPicking] = useState(false)
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
          </li>
        ))}
      </ul>
    </section>
  )
}
