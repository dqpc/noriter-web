import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { GameHost } from '../games/types'
import { findGame } from '../games/registry'
import { getBestScore, setBestScore } from '../lib/storage'

export function Play() {
  const { gameId } = useParams()
  const game = findGame(gameId)
  const [best, setBest] = useState(() => (game ? getBestScore(game.id) : 0))

  // host 는 게임 컴포넌트가 useEffect 의존성으로 쓰므로 참조가 안정적이어야 한다.
  const host = useMemo<GameHost>(() => {
    const id = game?.id ?? ''
    return {
      onScore: (score) => {
        setBestScore(id, score)
        setBest((b) => Math.max(b, score))
      },
      onGameOver: () => {
        // TODO: 로그인/리더보드 붙이면 여기서 서버에 제출 (score, result.won, result.elapsedMs)
      },
    }
  }, [game?.id])

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

  const { Component } = game
  return (
    <section className="page play">
      <div className="play-bar">
        <Link to="/" className="play-back" aria-label="목록으로">
          ←
        </Link>
        <span className="play-title">{game.name}</span>
        <span className="play-best">
          BEST <b>{best}</b>
        </span>
      </div>
      <Component host={host} />
      <aside className="ad-slot" aria-hidden="true">
        {/* 광고 자리: 나중에 AdSense 태그를 넣는다. 게임 캔버스 밖에 둔다. */}
      </aside>
    </section>
  )
}
