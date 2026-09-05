import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { CharacterAvatar, characterSvg, findCharacter } from '../../characters'
import type { TurnProps } from '../types'
import { CENTER, CORNERS, FINISH, NODE_POS, THROW_LABEL, routeOf, toYutView, type YutMove } from './board'

const TOSS_MS = 1400
const STICK_DELAY_MS = 90
const LAND_AT = 0.62
const ROLL_MS = TOSS_MS + STICK_DELAY_MS * 3
const RESULT_MS = 1100
const STICK_SX = ['-28px', '-8px', '10px', '26px']
const STICK_RZ = ['-14deg', '6deg', '-5deg', '12deg']
const SPARKS: Record<string, number> = { BACKDO: 8, DO: 0, GAE: 0, GEOL: 6, YUT: 10, MO: 16 }

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
  const [hover, setHover] = useState<{ piece?: PieceKey; dest?: number } | null>(null)
  const [sel, setSel] = useState<Selection>({ key: '', piece: null, dest: null, branch: null })
  const selPiece = sel.key === stepKey ? sel.piece : null
  const selDest = sel.key === stepKey ? sel.dest : null
  const branch = sel.key === stepKey ? sel.branch : null
  const select = (piece: PieceKey | null, dest: number | null, br: YutMove[] | null = null) => {
    setSel({ key: stepKey, piece, dest, branch: br })
    setHover(null)
  }
  const throwKey = v.lastEvent?.type === 'throw' ? JSON.stringify([v.lastEvent, v.sticks]) : ''
  const [anim, setAnim] = useState<{ key: string; stage: 'roll' | 'result' | 'done'; rolling: boolean[] | null }>({
    key: '',
    stage: 'done',
    rolling: null,
  })
  const throwing = throwKey !== '' && (anim.key !== throwKey || anim.stage === 'roll')
  const showResult = throwKey !== '' && anim.key === throwKey && anim.stage === 'result'
  const result = v.lastEvent?.type === 'throw' ? String(v.lastEvent.result) : ''
  const animating = throwing || showResult
  const rolling = anim.rolling ?? v.sticks
  const now = useNow(!v.ended)

  const myTurn = me !== null && v.turn === me && !v.ended
  const bots = v.players.filter((p) => p.bot)
  const botTurn = !v.ended && bots.some((p) => p.id === v.turn)
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const nameOf = (id: string) => byId.get(id)?.nickname ?? id
  const characterOf = (id: string) => byId.get(id)?.character ?? null

  useEffect(() => {
    if (!throwKey) return
    const finalSticks = (JSON.parse(throwKey) as [unknown, boolean[]])[1]
    const start = Date.now()
    let delay = 55
    let flip = 0
    const tick = () => {
      const t = Date.now() - start
      setAnim({
        key: throwKey,
        stage: 'roll',
        rolling: finalSticks.map((f, i) => (t >= TOSS_MS * LAND_AT + i * STICK_DELAY_MS ? f : Math.random() < 0.5)),
      })
      delay = Math.min(delay * 1.15, 200)
      flip = window.setTimeout(tick, delay)
    }
    tick()
    const toResult = window.setTimeout(() => {
      window.clearTimeout(flip)
      setAnim({ key: throwKey, stage: 'result', rolling: null })
    }, ROLL_MS)
    const toDone = window.setTimeout(
      () => setAnim({ key: throwKey, stage: 'done', rolling: null }),
      ROLL_MS + RESULT_MS,
    )
    return () => {
      window.clearTimeout(flip)
      window.clearTimeout(toResult)
      window.clearTimeout(toDone)
    }
  }, [throwKey])

  const active = myTurn && v.phase === 'MOVE' && !throwing
  const myPieces = me ? (v.players.find((p) => p.id === me)?.pieces ?? []) : []
  const waitingIds = new Set(myPieces.filter((pc) => pc.path === null && !pc.finished).map((pc) => pc.id))
  const keyOf = (m: YutMove): PieceKey => (waitingIds.has(m.pieceId) ? 'new' : m.pieceId)
  const candidates = (active ? v.legalMoves : []).filter(
    (m) => (selPiece === null || keyOf(m) === selPiece) && (selDest === null || m.dest === selDest),
  )
  const destGroups = new Map<number, YutMove[]>()
  for (const m of candidates) destGroups.set(m.dest, [...(destGroups.get(m.dest) ?? []), m])
  const newMoves = active ? v.legalMoves.filter((m) => keyOf(m) === 'new') : []
  const hotMoves = !hover
    ? []
    : candidates.filter((m) => (hover.dest !== undefined ? m.dest === hover.dest : keyOf(m) === hover.piece))
  const hotPieces = new Set(hotMoves.map(keyOf))
  const hotDests = new Set(hotMoves.map((m) => m.dest))
  const hovering = hotMoves.length > 0
  const routes = hotMoves.map((m) => {
    const pc = myPieces.find((x) => x.id === m.pieceId)
    const origin = pc?.path ? pc.node : 0
    const nodes = [origin, ...routeOf(pc?.path ?? null, pc?.index ?? 0, m)]
    const pts = nodes.map((n) => NODE_POS[n])
    if (m.dest === FINISH) pts.push([504, 535])
    return { key: `${m.pieceId}-${m.result}-${m.via}`, points: pts.map(([x, y]) => `${x},${y}`).join(' ') }
  })
  const nodeClass = (node: number, base: string) => `${base} ${hovering ? (hotDests.has(node) ? 'hot' : 'cold') : ''}`
  const pieceClass = (key: PieceKey, base: string) => `${base} ${hovering ? (hotPieces.has(key) ? 'hot' : 'cold') : ''}`
  const hint = !active
    ? null
    : branch
      ? '어느 쪽으로 갈까요?'
      : selDest !== null
        ? '어느 말로 갈까요? 말을 누르세요'
        : selPiece !== null
          ? '도착지를 누르세요'
          : candidates.length === 0
            ? '움직일 수 있는 말이 없습니다'
            : '말이나 도착지를 누르세요'

  const pickPiece = (key: PieceKey) => {
    const ms = candidates.filter((m) => keyOf(m) === key)
    if (ms.length === 0) return
    if (ms.length === 1) send(ms[0])
    else if (selPiece === key) select(null, null)
    else select(key, null)
  }
  const send = (m: YutMove) => {
    onAction({ type: 'move', pieceId: m.pieceId, result: m.result, ...(m.via !== null ? { via: m.via } : {}) })
    select(null, null)
  }

  const remainMs = v.deadline ? Math.max(0, new Date(v.deadline).getTime() - now) : 0

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
                  : botTurn
                    ? '자동 진행 중'
                    : v.phase === 'THROW'
                      ? '던지는 중'
                      : '말 고르는 중'}
              </span>
              <span className="yut-timer">{Math.ceil(remainMs / 1000)}s</span>
            </>
          )}
        </div>
        <div className="yut-sticks" aria-label="윷가락">
          {!animating &&
            v.sticks.map((flat, i) => (
              <span key={i} className={`yut-stick ${flat ? 'flat' : 'round'}`}>
                {i === 0 && <i className="yut-mark" />}
              </span>
            ))}
          {!animating && result && <span className="yut-result">{THROW_LABEL[result] ?? ''}</span>}
        </div>
      </div>

      {bots.length > 0 && !v.ended && (
        <div className={`yut-auto ${botTurn ? 'active' : ''}`} role="status">
          <i className="yut-auto-dot" />
          자동 진행 중 · {bots.map((p) => nameOf(p.id)).join(', ')}
          {' 대신 봇이 둡니다'}
        </div>
      )}
      <div className={`yut-board-wrap ${showResult && result === 'MO' ? 'shake' : ''}`}>
        <svg className="yut-board" viewBox="0 0 560 560" role="img" aria-label="말판">
          <rect x="60" y="60" width="440" height="440" className="yut-line" />
          <line x1="500" y1="500" x2="60" y2="60" className="yut-line" />
          <line x1="500" y1="60" x2="60" y2="500" className="yut-line" />
          {NODE_POS.map(([x, y], i) => {
            const corner = CORNERS.has(i) || i === CENTER
            const group = destGroups.get(i)
            return (
              <g
                key={i}
                className={group ? nodeClass(i, 'yut-node target') : 'yut-node'}
                onClick={() => group && clickDest(i)}
                onMouseEnter={() => group && setHover({ dest: i })}
                onMouseLeave={() => setHover(null)}
              >
                <circle cx={x} cy={y} r={corner ? 17 : 12} />
                {group && <circle cx={x} cy={y} r={corner ? 24 : 19} className="yut-target-ring" />}
              </g>
            )
          })}
          {destGroups.get(FINISH) && (
            <g
              className={nodeClass(FINISH, 'yut-node target')}
              onClick={() => clickDest(FINISH)}
              onMouseEnter={() => setHover({ dest: FINISH })}
              onMouseLeave={() => setHover(null)}
            >
              <rect x="456" y="520" width="96" height="30" rx="8" />
              <text x="504" y="540" className="yut-finish-label">
                나가기 · {resultLabel(destGroups.get(FINISH) ?? [])}
              </text>
            </g>
          )}
          {routes.map((r) => (
            <polyline key={r.key} points={r.points} className="yut-route" />
          ))}
          {v.players.map((p) =>
            groupPieces(p.pieces).map((g) => {
              const [x, y] = NODE_POS[g.node]
              const mine = p.id === me
              const selectable = active && g.ids.some((id) => candidates.some((m) => m.pieceId === id))
              const selected = selPiece !== null && g.ids.includes(selPiece as number)
              const offset = playerOffset(v.players, p.id)
              return (
                <g
                  key={`${p.id}-${g.node}`}
                  className={pieceClass(
                    g.ids[0],
                    `yut-piece ${mine ? 'mine' : ''} ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''}`,
                  )}
                  transform={`translate(${x + offset[0]} ${y + offset[1] - 18})`}
                  onClick={() => selectable && pickPiece(g.ids[0])}
                  onMouseEnter={() => selectable && setHover({ piece: g.ids[0] })}
                  onMouseLeave={() => setHover(null)}
                >
                  {g.ids.map((id, i) => (
                    <image
                      key={id}
                      href={`data:image/svg+xml;utf8,${encodeURIComponent(characterSvg(findCharacter(characterOf(p.id)), 'R'))}`}
                      x={-16 + i * 6}
                      y={-16 - i * 7}
                      width="32"
                      height="32"
                    />
                  ))}
                  {g.ids.length > 1 && (
                    <g transform={`translate(${14 + (g.ids.length - 1) * 6} ${-14 - (g.ids.length - 1) * 7})`}>
                      <circle r="9" className="yut-stack-badge" />
                      <text y="4" className="yut-stack-text">
                        {g.ids.length}
                      </text>
                    </g>
                  )}
                </g>
              )
            }),
          )}
          {newMoves.length > 0 && (
            <g
              className={pieceClass(
                'new',
                `yut-piece yut-new selectable ${selPiece === 'new' ? 'selected' : ''} ${selDest !== null && !candidates.some((m) => keyOf(m) === 'new') ? 'dim' : ''}`,
              )}
              transform={`translate(${NODE_POS[0][0]} ${NODE_POS[0][1] - 18})`}
              onClick={() => pickPiece('new')}
              onMouseEnter={() => setHover({ piece: 'new' })}
              onMouseLeave={() => setHover(null)}
            >
              <image
                href={`data:image/svg+xml;utf8,${encodeURIComponent(characterSvg(findCharacter(characterOf(me ?? '')), 'R'))}`}
                x="-16"
                y="-16"
                width="32"
                height="32"
              />
              <g transform="translate(14 -14)">
                <circle r="9" className="yut-stack-badge" />
                <text y="4" className="yut-stack-text">
                  +{waitingIds.size}
                </text>
              </g>
            </g>
          )}
          {[...destGroups.entries()]
            .filter(([node]) => node >= 0)
            .map(([node, ms]) => {
              const [x, y] = NODE_POS[node]
              const corner = CORNERS.has(node) || node === CENTER
              const capture = ms.some((m) => m.captures > 0)
              const stack = !capture && ms.some((m) => m.stacks > 0)
              return (
                <text key={node} x={x} y={y + (corner ? 36 : 31)} className={nodeClass(node, 'yut-dest-label')}>
                  {resultLabel(ms)}
                  {capture && <tspan className="capture"> 잡기!</tspan>}
                  {stack && <tspan className="stack"> 업기</tspan>}
                </text>
              )
            })}
        </svg>
        {(throwing || showResult) && (
          <div className={`yut-fx ${showResult ? `show yut-fx-${result.toLowerCase()}` : 'roll'}`} aria-hidden>
            {throwing ? (
              <div className="yut-fx-sticks">
                {rolling.map((flat, i) => (
                  <span
                    key={i}
                    className={`yut-stick ${flat ? 'flat' : 'round'} tossing`}
                    style={
                      {
                        '--dl': `${i * STICK_DELAY_MS}ms`,
                        '--sx': STICK_SX[i],
                        '--rz': STICK_RZ[i],
                      } as CSSProperties
                    }
                  >
                    {i === 0 && <i className="yut-mark" />}
                  </span>
                ))}
              </div>
            ) : (
              <>
                <i className="yut-fx-ring" />
                <i className="yut-fx-ring r2" />
                {Array.from({ length: SPARKS[result] ?? 0 }, (_, i) => (
                  <i
                    key={i}
                    className="yut-fx-spark"
                    style={{ '--a': `${(i * 360) / (SPARKS[result] ?? 1)}deg` } as CSSProperties}
                  />
                ))}
                <span className="yut-fx-text">{THROW_LABEL[result] ?? ''}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="yut-controls">
        {!animating && (v.queue.length > 0 || v.bonusThrows > 0) && (
          <div className="yut-queue">
            {v.queue.length > 0 && <span className="room-hint">남은 결과</span>}
            {v.queue.map((r, i) => (
              <span key={`${r}-${i}`} className="yut-chip">
                {THROW_LABEL[r]}
              </span>
            ))}
            {v.bonusThrows > 0 && <span className="room-hint">한 번 더 ×{v.bonusThrows}</span>}
          </div>
        )}
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
        {hint && !animating && <p className="room-hint yut-hint">{hint}</p>}
        {branch && (
          <div className="yut-branch">
            {branch.map((m) => (
              <button key={String(m.via)} type="button" className="btn" onClick={() => send(m)}>
                {m.via === 27 ? '사려 방향' : '속윷 방향'} → {destName(v.names, m.dest)}
                {m.captures > 0 ? ' (잡기!)' : ''}
              </button>
            ))}
          </div>
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
    else if (ms.length > 1) {
      const pieces = new Set(ms.map(keyOf))
      if (pieces.size > 1) select(selPiece, node)
      else select(selPiece, node, ms)
    }
  }
}

type PieceKey = number | 'new'
interface Selection {
  key: string
  piece: PieceKey | null
  dest: number | null
  branch: YutMove[] | null
}

function resultLabel(ms: YutMove[]): string {
  return Array.from(new Set(ms.map((m) => THROW_LABEL[m.result] ?? m.result))).join('/')
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

function destName(names: string[], dest: number): string {
  return dest === FINISH ? '완주' : (names?.[dest] ?? String(dest))
}
