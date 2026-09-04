import { Link } from 'react-router-dom'
import { GAMES } from '../games/registry'
import { getBestScore } from '../lib/storage'

export function Home() {
  return (
    <section className="page">
      <h1 className="page-title">놀이터</h1>
      <p className="page-sub">가볍게 한판. 로그인 없이 바로 시작.</p>
      <ul className="game-list">
        {GAMES.map((g) => (
          <li key={g.id}>
            <Link to={`/games/${g.id}`} className="game-card">
              <span className="game-card-name">{g.name}</span>
              <span className="game-card-desc">{g.description}</span>
              <span className="game-card-best">최고 {getBestScore(g.id)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
