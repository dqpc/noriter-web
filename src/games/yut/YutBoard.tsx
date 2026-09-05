import { useEffect, useMemo, useState } from 'react'
import { CharacterAvatar, characterSvg, findCharacter } from '../../characters'
import type { TurnProps } from '../types'
import { CENTER, CORNERS, FINISH, NODE_POS, THROW_LABEL, toYutView, type YutMove } from './board'

const THROW_ANIM_MS = 800

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

export function YutBoard({ view, me, players, onAction }: TurnProps) {
  const v = useMemo(() => toYutView(view), [view])
  const stepKey = `${v.turn}:${v.phase}:${v.queue.join(',')}`
  const [sel, setSel] = useState<{ key: string; chip: string | null; pending: YutMove[] | null }>({
    key: '',
    chip: null,
    pending: null,
  })
  const distinct = Array.from(new Set(v.queue))
  const chip = sel.key === stepKey ? sel.chip : distinct.length === 1 ? distinct[0] : null
  const pending = sel.key === stepKey ? sel.pending : null
  const setChip = (c: string | null) => setSel({ key: stepKey, chip: c, pending: null })
  const setPending = (m: YutMove[] | null) => setSel({ key: stepKey, chip, pending: m })
  const throwKey = v.lastEvent?.type === 'throw' ? JSON.stringify([v.lastEvent, v.sticks]) : ''
  const [anim, setAnim] = useState<{ key: string; rolling: boolean[] | null }>({ key: '', rolling: null })
  const throwing = throwKey !== '' && (anim.key !== throwKey || anim.rolling !== null)
  const rolling = anim.rolling ?? v.sticks
  const now = useNow(!v.ended)

  const myTurn = me !== null && v.turn === me && !v.ended
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const nameOf = (id: string) => byId.get(id)?.nickname ?? id
  const characterOf = (id: string) => byId.get(id)?.character ?? null

  useEffect(() => {
    if (!throwKey) return
    const flips = window.setInterval(
      () => setAnim({ key: throwKey, rolling: Array.from({ length: 4 }, () => Math.random() < 0.5) }),
      90,
    )
    const stop = window.setTimeout(() => {
      window.clearInterval(flips)
      setAnim({ key: throwKey, rolling: null })
    }, THROW_ANIM_MS)
    return () => {
      window.clearInterval(flips)
      window.clearTimeout(stop)
    }
  }, [throwKey])

  const movesFor = (result: string | null) => (result ? v.legalMoves.filter((m) => m.result === result) : [])
  const active = myTurn && v.phase === 'MOVE' && !throwing
  const candidates = active ? movesFor(chip) : []
  const destNodes = new Set(candidates.map((m) => m.dest))
  const myPieces = me ? (v.players.find((p) => p.id === me)?.pieces ?? []) : []
  const waitingMove = candidates.find((m) =>
    myPieces.some((pc) => pc.id === m.pieceId && pc.path === null && !pc.finished),
  )

  const pickPiece = (pieceId: number) => {
    const ms = candidates.filter((m) => m.pieceId === pieceId)
    if (ms.length === 0) return
    if (ms.length === 1) send(ms[0])
    else setPending(ms)
  }
  const send = (m: YutMove) => {
    onAction({ type: 'move', pieceId: m.pieceId, result: m.result, ...(m.via !== null ? { via: m.via } : {}) })
    setPending(null)
  }

  const remainMs = v.deadline ? Math.max(0, new Date(v.deadline).getTime() - now) : 0
  const sticks = throwing ? rolling : v.sticks

  return (
    <div className="yut">
      <div className="yut-top">
        <div className="yut-turn">
          {v.ended ? (
            <span>게임 종료</span>
          ) : (
            <>
              <CharacterAvatar id={characterOf(v.turn)} size={26} />
              <b>{nameOf(v.turn)}</b>
              <span className="yut-turn-phase">
                {myTurn
                  ? v.phase === 'THROW'
                    ? '던지세요'
                    : '말을 고르세요'
                  : v.phase === 'THROW'
                    ? '던지는 중'
                    : '말 고르는 중'}
              </span>
              <span className="yut-timer">{Math.ceil(remainMs / 1000)}s</span>
            </>
          )}
        </div>
        <div className="yut-sticks" aria-label="윷가락">
          {sticks.map((flat, i) => (
            <span key={i} className={`yut-stick ${flat ? 'flat' : 'round'} ${throwing ? 'rolling' : ''}`}>
              {i === 0 && <i className="yut-mark" />}
            </span>
          ))}
          {!throwing && v.lastEvent?.type === 'throw' && (
            <span className="yut-result">{THROW_LABEL[String(v.lastEvent.result)] ?? ''}</span>
          )}
        </div>
      </div>

      <svg className="yut-board" viewBox="0 0 560 560" role="img" aria-label="말판">
        <rect x="60" y="60" width="440" height="440" className="yut-line" />
        <line x1="500" y1="500" x2="60" y2="60" className="yut-line" />
        <line x1="500" y1="60" x2="60" y2="500" className="yut-line" />
        {NODE_POS.map(([x, y], i) => {
          const corner = CORNERS.has(i) || i === CENTER
          const target = destNodes.has(i)
          return (
            <g key={i} className={target ? 'yut-node target' : 'yut-node'} onClick={() => target && clickDest(i)}>
              <circle cx={x} cy={y} r={corner ? 17 : 12} />
              {target && <circle cx={x} cy={y} r={corner ? 24 : 19} className="yut-target-ring" />}
            </g>
          )
        })}
        {finishTarget(candidates) && (
          <g className="yut-node target" onClick={() => clickDest(FINISH)}>
            <rect x="8" y="520" width="96" height="30" rx="8" />
            <text x="56" y="540" className="yut-finish-label">
              나가기
            </text>
          </g>
        )}
        {v.players.map((p) =>
          groupPieces(p.pieces).map((g) => {
            const [x, y] = NODE_POS[g.node]
            const mine = p.id === me
            const selectable = active && g.ids.some((id) => candidates.some((m) => m.pieceId === id))
            const offset = playerOffset(v.players, p.id)
            return (
              <g
                key={`${p.id}-${g.node}`}
                className={`yut-piece ${mine ? 'mine' : ''} ${selectable ? 'selectable' : ''}`}
                transform={`translate(${x + offset[0]} ${y + offset[1] - 18})`}
                onClick={() => selectable && pickPiece(g.ids[0])}
              >
                <image
                  href={`data:image/svg+xml;utf8,${encodeURIComponent(characterSvg(findCharacter(characterOf(p.id)), 'R'))}`}
                  x="-16"
                  y="-16"
                  width="32"
                  height="32"
                />
                {g.ids.length > 1 && (
                  <>
                    <circle cx="12" cy="-12" r="8" className="yut-stack-badge" />
                    <text x="12" y="-8.5" className="yut-stack-text">
                      {g.ids.length}
                    </text>
                  </>
                )}
              </g>
            )
          }),
        )}
      </svg>

      <div className="yut-controls">
        <div className="yut-queue">
          {v.queue.map((r, i) => (
            <button
              key={`${r}-${i}`}
              type="button"
              className={`btn ${chip === r ? '' : 'btn-ghost'} yut-chip`}
              disabled={!active}
              onClick={() => {
                setChip(r)
                setPending(null)
              }}
            >
              {THROW_LABEL[r]}
            </button>
          ))}
          {v.bonusThrows > 0 && <span className="room-hint">한 번 더 ×{v.bonusThrows}</span>}
        </div>
        {myTurn && v.phase === 'THROW' && (
          <button
            type="button"
            className="btn yut-throw"
            disabled={throwing}
            onClick={() => onAction({ type: 'throw' })}
          >
            윷 던지기
          </button>
        )}
        {active && chip && waitingMove && (
          <button type="button" className="btn btn-ghost" onClick={() => send(waitingMove)}>
            새 말 내기 → {destName(v.names, waitingMove.dest)}
            {waitingMove.captures > 0 ? ' (잡기!)' : ''}
          </button>
        )}
        {pending && (
          <div className="yut-branch">
            <span>어느 쪽으로?</span>
            {pending.map((m) => (
              <button key={String(m.via)} type="button" className="btn" onClick={() => send(m)}>
                {m.via === 27 ? '사려 방향' : '속윷 방향'} → {destName(v.names, m.dest)}
                {m.captures > 0 ? ' (잡기!)' : ''}
              </button>
            ))}
          </div>
        )}
        {active && chip && candidates.length === 0 && (
          <p className="room-hint">이 결과로 움직일 수 있는 말이 없습니다.</p>
        )}
      </div>

      <ol className="yut-players">
        {v.players.map((p) => (
          <li key={p.id} className={p.id === v.turn && !v.ended ? 'current' : ''}>
            <CharacterAvatar id={characterOf(p.id)} size={24} />
            <span className="yut-player-name">
              {nameOf(p.id)}
              {p.bot && <span className="room-done"> 봇</span>}
            </span>
            <span className="yut-player-pieces">
              {p.pieces.map((pc) => (
                <i key={pc.id} className={pc.finished ? 'done' : pc.path ? 'board' : 'wait'} />
              ))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )

  function clickDest(node: number) {
    const ms = candidates.filter((m) => m.dest === node)
    if (ms.length === 1) send(ms[0])
    else if (ms.length > 1) setPending(ms)
  }
}

function groupPieces(pieces: { id: number; node: number; path: string | null; index: number; finished: boolean }[]) {
  const groups = new Map<string, { node: number; ids: number[] }>()
  for (const p of pieces) {
    if (p.finished || p.node < 0) continue
    const key = `${p.path}:${p.index}`
    const g = groups.get(key) ?? { node: p.node, ids: [] }
    g.ids.push(p.id)
    groups.set(key, g)
  }
  return [...groups.values()]
}

function playerOffset(players: { id: string }[], id: string): [number, number] {
  const i = players.findIndex((p) => p.id === id)
  const offsets: [number, number][] = [
    [-9, -4],
    [9, -4],
    [-9, 8],
    [9, 8],
  ]
  return offsets[i] ?? [0, 0]
}

function finishTarget(candidates: YutMove[]): boolean {
  return candidates.some((m) => m.dest === FINISH)
}

function destName(names: string[], dest: number): string {
  return dest === FINISH ? '완주' : (names?.[dest] ?? String(dest))
}
