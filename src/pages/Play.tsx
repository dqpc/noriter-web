import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { GameHost, GameOptions } from '../games/types'
import { findGame } from '../games/registry'
import { getBestScore, setBestScore } from '../lib/storage'
import { useActivity } from '../auth/useAuth'
import { finishPlay, startPlay } from '../lib/auth'
import { FullscreenButton } from '../components/FullscreenButton'
import { HomeButton } from '../components/HomeButton'

interface Session {
  /** 서버가 세션을 못 열었으면 null. 그 판은 기록하지 않는다 */
  playId: string | null
  seed: number
}

const localSeed = () => Math.floor(Math.random() * 2147483646) + 1

/** 서버가 seed 를 주고 끝날 때 점수를 검증한다. 서버가 죽어 있어도 게임은 시작되게 로컬 seed 로 대신한다 */
async function openSession(gameId: string): Promise<Session> {
  try {
    const started = await startPlay(gameId)
    return { playId: started.playId, seed: started.seed }
  } catch {
    return { playId: null, seed: localSeed() }
  }
}

export function Play() {
  const { gameId } = useParams()
  const game = findGame(gameId)
  const [best, setBest] = useState(() => (game ? getBestScore(game.id) : 0))
  useActivity('PLAYING', game?.id)

  // 세션이 필요한 게임(점수 게임)만. 글딱지는 자기 API 로 기록한다
  const tracked = Boolean(game?.Component && !game.solo)
  const [seed, setSeed] = useState<number | null>(null)
  const playRef = useRef<string | null>(null)

  useEffect(() => {
    if (!game || !tracked) return
    let alive = true
    openSession(game.id).then((s) => {
      if (!alive) return
      playRef.current = s.playId
      setSeed(s.seed)
    })
    return () => {
      alive = false
    }
  }, [game, tracked])

  // host 는 게임 컴포넌트가 useEffect 의존성으로 쓰므로 참조가 안정적이어야 한다.
  const host = useMemo<GameHost>(() => {
    const id = game?.id ?? ''
    return {
      onScore: (score) => {
        setBestScore(id, score)
        setBest((b) => Math.max(b, score))
      },
      onGameOver: (score, result) => {
        const playId = playRef.current
        playRef.current = null
        if (!playId) return
        finishPlay(id, playId, result.moves === undefined ? { score } : { score, moves: result.moves }).catch(() => {})
      },
      startPlay: async () => {
        const s = await openSession(id)
        playRef.current = s.playId
        return s.playId === null ? null : s.seed
      },
    }
  }, [game?.id])

  const options = useMemo<GameOptions | undefined>(() => (seed === null ? undefined : { seed }), [seed])

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
  if (!Component) {
    return (
      <section className="page">
        <p>이 게임은 같이 하기만 지원합니다.</p>
        <Link to={`/games/${game.id}`} className="btn">
          돌아가기
        </Link>
      </section>
    )
  }
  return (
    <section className="page play">
      <div className="play-bar">
        <Link to={`/games/${game.id}`} className="play-back" aria-label="뒤로">
          ←
        </Link>
        <span className="play-title">{game.name}</span>
        {!game.solo && (
          <span className="play-best">
            BEST <b>{best}</b>
          </span>
        )}
        <HomeButton />
        <FullscreenButton />
      </div>
      {tracked && seed === null ? <p className="room-hint">준비 중…</p> : <Component host={host} options={options} />}
      <aside className="ad-slot" aria-hidden="true">
        {/* 광고 자리: 나중에 AdSense 태그를 넣는다. 게임 캔버스 밖에 둔다. */}
      </aside>
    </section>
  )
}
