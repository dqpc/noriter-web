import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { CharacterAvatar, characterSvg, findCharacter } from '../../characters'
import type { TurnProps } from '../types'
import {
  CENTER,
  CORNERS,
  FINISH,
  NODE_POS,
  THROW_LABEL,
  rolledLabel,
  routeOf,
  stepsBetween,
  toYutView,
  type YutMove,
  type YutPieceView,
  type YutView,
} from './board'
import { useCardShow } from './cardShow'
import { YutCards } from './YutCards'

const TOSS_MS = 1400
const STICK_DELAY_MS = 90
const LAND_AT = 0.62
const ROLL_MS = TOSS_MS + STICK_DELAY_MS * 3
const RESULT_MS = 1100
const STICK_SX = ['-28px', '-8px', '10px', '26px']
const STICK_RZ = ['-14deg', '6deg', '-5deg', '12deg']
const SPARKS: Record<string, number> = { BACKDO: 8, DO: 0, GAE: 0, GEOL: 4, YUT: 14, MO: 24 }
const STEP_MS = 260
const CAPTURE_MS = 750
const BLOCK_MS = 900
const THROW_CHOICES = ['BACKDO', 'DO', 'GAE', 'GEOL', 'YUT', 'MO']

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

export function YutBoard({ view, me, players, onAction, clockOffset = 0 }: TurnProps) {
  const v = useMemo(() => toYutView(view), [view])
  const stepKey = `${v.turn}:${v.phase}:${v.queue.map((r) => `${r.result}${r.steps}`).join(',')}`
  const [hover, setHover] = useState<{ piece?: PieceKey; dest?: number } | null>(null)
  const [sel, setSel] = useState<Selection>({ key: '', piece: null, dest: null, branch: null, armed: null })
  const selPiece = sel.key === stepKey ? sel.piece : null
  const selDest = sel.key === stepKey ? sel.dest : null
  const branch = sel.key === stepKey ? sel.branch : null
  const armed = sel.key === stepKey ? sel.armed : null
  const select = (
    piece: PieceKey | null,
    dest: number | null,
    br: YutMove[] | null = null,
    arm: string | null = null,
  ) => {
    setSel({ key: stepKey, piece, dest, branch: br, armed: arm })
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
  const resultSuffix =
    v.lastEvent?.type === 'throw' ? (v.lastEvent.boosted ? '+1' : v.lastEvent.converted ? ' (빽도 무효)' : '') : ''
  const animating = throwing || showResult
  const rolling = anim.rolling ?? v.sticks
  const now = useNow(!v.ended) + clockOffset

  const { motion, settling } = useMotion(v)
  const busy =
    settling ||
    Object.keys(motion.overrides).length > 0 ||
    motion.linger.length > 0 ||
    motion.captures.length > 0 ||
    motion.blocks.length > 0
  const blockNodes = new Set(motion.blocks.map((b) => b.node))
  const cardShow = useCardShow(v, busy || animating)
  const cardOpen = cardShow !== null
  const [shown, setShown] = useState({ turn: v.turn, phase: v.phase, actor: v.actor })
  if (!busy && !cardOpen && (shown.turn !== v.turn || shown.phase !== v.phase || shown.actor !== v.actor)) {
    setShown({ turn: v.turn, phase: v.phase, actor: v.actor })
  }
  const phase = shown.phase
  const actor = shown.actor
  const myTurnShown = me !== null && actor === me && !v.ended
  const myTurn = myTurnShown && !busy && !cardOpen
  const bots = v.players.filter((p) => p.bot)
  const botTurn = !v.ended && bots.some((p) => p.id === actor)
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const nameOf = (id: string) => byId.get(id)?.nickname ?? id
  const characterOf = (id: string) => byId.get(id)?.character ?? null
  const mePlayer = v.players.find((p) => p.id === me) ?? null

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

  const active = myTurn && phase === 'MOVE' && !throwing
  const myPieces = mePlayer?.pieces ?? []
  const waitingIds = new Set(myPieces.filter((pc) => pc.path === null && !pc.finished).map((pc) => pc.id))
  const keyOf = (m: YutMove): PieceKey => (waitingIds.has(m.pieceId) ? 'new' : m.pieceId)
  const moveKey = (m: YutMove) => `${m.pieceId}-${m.result}-${m.steps}-${m.via}`
  const candidates = (active ? v.legalMoves : []).filter(
    (m) => (selPiece === null || keyOf(m) === selPiece) && (selDest === null || m.dest === selDest),
  )
  const destGroups = new Map<number, YutMove[]>()
  for (const m of candidates) destGroups.set(m.dest, [...(destGroups.get(m.dest) ?? []), m])
  const newMoves = active ? v.legalMoves.filter((m) => keyOf(m) === 'new') : []
  const armedMove = armed ? candidates.find((m) => moveKey(m) === armed) : undefined
  const hotMoves = hover
    ? candidates.filter((m) => (hover.dest !== undefined ? m.dest === hover.dest : keyOf(m) === hover.piece))
    : armedMove
      ? [armedMove]
      : []
  const hotPieces = new Set(hotMoves.map(keyOf))
  const hotDests = new Set(hotMoves.map((m) => m.dest))
  const hovering = hotMoves.length > 0
  const routes = hotMoves.map((m) => {
    const pc = myPieces.find((x) => x.id === m.pieceId)
    const origin = pc?.path ? pc.node : 0
    const nodes = [origin, ...routeOf(pc?.path ?? null, pc?.index ?? 0, m)]
    const pts = nodes.map((n) => NODE_POS[n])
    if (m.dest === FINISH) pts.push([504, 535])
    return { key: moveKey(m), points: pts.map(([x, y]) => `${x},${y}`).join(' ') }
  })
  const nodeClass = (node: number, base: string) =>
    `${base} ${hovering ? (hotDests.has(node) ? 'hot' : 'cold') : ''} ${armedMove && armedMove.dest === node ? 'armed' : ''}`
  const pieceClass = (key: PieceKey, base: string) => `${base} ${hovering ? (hotPieces.has(key) ? 'hot' : 'cold') : ''}`
  const onlyChoice = active && v.legalMoves.length === 1
  const hint = !active
    ? null
    : branch
      ? '어느 쪽으로 갈까요?'
      : onlyChoice
        ? '갈 곳이 하나뿐입니다. 누르면 바로 이동합니다'
        : armedMove
          ? '같은 곳을 한 번 더 누르면 이동합니다'
          : selDest !== null
            ? '어느 말로 갈까요? 말을 누르면 바로 이동합니다'
            : selPiece !== null
              ? '도착지를 누르세요'
              : candidates.length === 0
                ? '움직일 수 있는 말이 없습니다'
                : '말이나 도착지를 누르세요'
  const eventNote =
    v.lastEvent?.type === 'skipTurn'
      ? `${nameOf(String(v.lastEvent.player))} 님은 이번 차례를 쉽니다 (쉬어!)`
      : v.lastEvent?.type === 'surrender'
        ? `${nameOf(String(v.lastEvent.player))} 님이 항복했습니다`
        : null

  /** 첫 번째 누름은 경로만 보여주고, 같은 수를 한 번 더 누르면 보낸다 */
  const confirm = (m: YutMove) => {
    if (onlyChoice || armed === moveKey(m)) send(m)
    else select(selPiece, selDest, null, moveKey(m))
  }
  const pickPiece = (key: PieceKey) => {
    const ms = candidates.filter((m) => keyOf(m) === key)
    if (ms.length === 0) return
    if (ms.length === 1) {
      if (selDest !== null) send(ms[0])
      else confirm(ms[0])
    } else if (selPiece === key) select(null, null)
    else select(key, null)
  }
  const send = (m: YutMove) => {
    onAction({
      type: 'move',
      pieceId: m.pieceId,
      result: m.result,
      steps: m.steps,
      ...(m.via !== null ? { via: m.via } : {}),
    })
    select(null, null)
  }
  const surrender = () => {
    if (window.confirm('항복할까요? 말을 모두 거두고 순위가 맨 아래로 내려갑니다.')) onAction({ type: 'surrender' })
  }

  const remainMs = v.deadline ? Math.max(0, new Date(v.deadline).getTime() - now) : 0
  const effectRows = v.players.filter((p) => p.effects.length > 0 && !p.resigned)

  return (
    <div className={`yut ${v.ended ? '' : myTurnShown ? 'my-turn' : 'their-turn'}`}>
      <div className="yut-top">
        <div className="yut-turn">
          {v.ended ? (
            <span>게임 종료</span>
          ) : (
            <>
              <span className={`yut-turn-badge ${myTurnShown ? 'mine' : ''}`}>
                {actor === ''
                  ? '준비'
                  : phase === 'CARD'
                    ? myTurnShown
                      ? '카드 선택'
                      : '카드 대기'
                    : myTurnShown
                      ? '내 차례'
                      : '상대 차례'}
              </span>
              {actor !== '' && <CharacterAvatar id={characterOf(actor)} size={26} />}
              <b>{actor === '' ? '곧 시작합니다' : nameOf(actor)}</b>
              <span className="yut-turn-phase">
                {phase === 'CARD'
                  ? myTurnShown
                    ? '카드를 고르세요'
                    : '카드 고르는 중'
                  : myTurn
                    ? phase === 'THROW'
                      ? '던지세요'
                      : '말을 고르세요'
                    : botTurn
                      ? '자동 진행 중'
                      : phase === 'THROW'
                        ? '던지는 중'
                        : '말 고르는 중'}
              </span>
              {actor !== '' && <span className="yut-timer">{Math.ceil(remainMs / 1000)}s</span>}
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
          {!animating && result && (
            <span className="yut-result">
              {THROW_LABEL[result] ?? ''}
              {resultSuffix}
            </span>
          )}
        </div>
      </div>

      {bots.length > 0 && !v.ended && (
        <div className={`yut-auto ${botTurn ? 'active' : ''}`} role="status">
          <i className="yut-auto-dot" />
          자동 진행 중 · {bots.map((p) => nameOf(p.id)).join(', ')}
          {' 대신 봇이 둡니다'}
        </div>
      )}
      {effectRows.length > 0 && !v.ended && (
        <div className="yut-effects">
          {effectRows.map((p) => (
            <span key={p.id} className={`yut-effects-row ${p.id === me ? 'mine' : ''}`}>
              <span className="yut-effects-name">{p.id === me ? '내 효과' : nameOf(p.id)}</span>
              {p.effects.map((e) => (
                <span key={e.id} className={`yut-effect ${e.id.toLowerCase()}`}>
                  {e.label}
                </span>
              ))}
            </span>
          ))}
        </div>
      )}
      <div
        className={`yut-board-wrap ${showResult && result === 'MO' ? 'shake' : showResult && result === 'YUT' ? 'shake-soft' : ''}`}
      >
        <svg className="yut-board" viewBox="0 0 560 560" role="img" aria-label="말판">
          <defs>
            <radialGradient id="yut-bang-glow">
              <stop offset="0" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="yut-bang-fill" cx="0.4" cy="0.35">
              <stop offset="0" stopColor="#fde68a" />
              <stop offset="0.6" stopColor="#d97706" />
              <stop offset="1" stopColor="#78350f" />
            </radialGradient>
          </defs>
          <rect x="60" y="60" width="440" height="440" className="yut-line" />
          <line x1="500" y1="500" x2="60" y2="60" className="yut-line" />
          <line x1="500" y1="60" x2="60" y2="500" className="yut-line" />
          <g className="yut-bang" transform={`translate(${NODE_POS[CENTER][0]} ${NODE_POS[CENTER][1]})`}>
            <circle r="52" fill="url(#yut-bang-glow)" />
            <circle r="36" className="yut-bang-ring" />
            <path d="M0,-34 L7,-7 L34,0 L7,7 L0,34 L-7,7 L-34,0 L-7,-7 Z" className="yut-bang-star" />
            <path d="M0,-26 L4,-4 L26,0 L4,4 L0,26 L-4,4 L-26,0 L-4,-4 Z" className="yut-bang-star inner" />
          </g>
          {NODE_POS.map(([x, y], i) => {
            const corner = CORNERS.has(i) || i === CENTER
            const group = destGroups.get(i)
            return (
              <g
                key={i}
                className={`${group ? nodeClass(i, 'yut-node target') : 'yut-node'} ${i === CENTER ? 'bang' : ''}`}
                onClick={() => group && clickDest(i)}
                onMouseEnter={() => group && setHover({ dest: i })}
                onMouseLeave={() => setHover(null)}
              >
                <circle cx={x} cy={y} r={corner ? 17 : 12} />
                {i === CENTER && (
                  <text x={x} y={y + 5} className="yut-bang-text">
                    방
                  </text>
                )}
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
            groupPieces(displayPieces(p, motion)).map((g) => {
              const [x, y] = NODE_POS[g.node]
              const mine = p.id === me
              const selectable = !g.moving && active && g.ids.some((id) => candidates.some((m) => m.pieceId === id))
              const selected = selPiece !== null && g.ids.includes(selPiece as number)
              const shielded = p.effects.some((e) => e.id === 'SHIELD')
              const blocking = shielded && blockNodes.has(g.node)
              const offset = playerOffset(v.players, p.id)
              return (
                <g
                  key={`${p.id}-${g.ids.join('.')}`}
                  className={pieceClass(
                    g.ids[0],
                    `yut-piece ${mine ? 'mine' : ''} ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''} ${g.moving ? 'moving' : ''} ${shielded ? 'shielded' : ''} ${blocking ? 'blocking' : ''}`,
                  )}
                  transform={`translate(${x + offset[0]} ${y + offset[1] - 18})`}
                  onClick={() => selectable && pickPiece(g.ids[0])}
                  onMouseEnter={() => selectable && setHover({ piece: g.ids[0] })}
                  onMouseLeave={() => setHover(null)}
                >
                  {shielded && <circle r="21" className="yut-shield" />}
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
          {motion.blocks.map((b) => {
            const [x, y] = NODE_POS[b.node]
            return (
              <g key={b.key} className="yut-block" transform={`translate(${x} ${y - 18})`}>
                <circle className="yut-block-ring" r="16" />
                <circle className="yut-block-ring r2" r="16" />
                <text className="yut-block-text" y="-32">
                  막았다!
                </text>
              </g>
            )
          })}
          {motion.captures.map((c) => {
            const [x, y] = NODE_POS[c.node]
            return (
              <g key={c.key} className="yut-capture" transform={`translate(${x} ${y - 18})`}>
                <circle className="yut-capture-ring" r="14" />
                <image
                  className="yut-capture-piece"
                  href={`data:image/svg+xml;utf8,${encodeURIComponent(characterSvg(findCharacter(characterOf(c.playerId)), 'R'))}`}
                  x="-16"
                  y="-16"
                  width="32"
                  height="32"
                />
                <text className="yut-capture-text" y="-30">
                  잡았다!
                </text>
              </g>
            )
          })}
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
              const blocked = !capture && ms.some((m) => m.blocked > 0)
              const stack = !capture && !blocked && ms.some((m) => m.stacks > 0)
              return (
                <text key={node} x={x} y={y + (corner ? 36 : 31)} className={nodeClass(node, 'yut-dest-label')}>
                  {resultLabel(ms)}
                  {capture && <tspan className="capture"> 잡기!</tspan>}
                  {blocked && <tspan className="blocked"> 보호막</tspan>}
                  {stack && <tspan className="stack"> 업기</tspan>}
                  {node === CENTER && !capture && <tspan className="bonus"> 카드</tspan>}
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
                {result === 'MO' && <i className="yut-fx-ring r3" />}
                {result === 'MO' && <i className="yut-fx-flash" />}
                {Array.from({ length: SPARKS[result] ?? 0 }, (_, i) => (
                  <i
                    key={i}
                    className="yut-fx-spark"
                    style={{ '--a': `${(i * 360) / (SPARKS[result] ?? 1)}deg` } as CSSProperties}
                  />
                ))}
                <span className="yut-fx-text">
                  {THROW_LABEL[result] ?? ''}
                  {v.lastEvent?.boosted ? '+1' : ''}
                </span>
              </>
            )}
          </div>
        )}
        {cardShow && (
          <YutCards
            show={cardShow}
            me={me}
            nameOf={nameOf}
            remainMs={remainMs}
            onPick={(index) => onAction({ type: 'card', index })}
          />
        )}
      </div>

      <div className="yut-controls">
        {!animating && (v.queue.length > 0 || v.bonusThrows > 0) && (
          <div className="yut-queue">
            {v.queue.length > 0 && <span className="room-hint">남은 결과</span>}
            {v.queue.map((r, i) => (
              <span key={`${r.result}-${r.steps}-${i}`} className="yut-chip">
                {rolledLabel(r)}
              </span>
            ))}
            {v.bonusThrows > 0 && <span className="room-hint">한 번 더 ×{v.bonusThrows}</span>}
          </div>
        )}
        {myTurn && phase === 'THROW' && !v.chooseThrow && (
          <button
            type="button"
            className="btn yut-throw"
            disabled={throwing}
            onClick={() => onAction({ type: 'throw' })}
          >
            윷 던지기
            {mePlayer?.effects.some((e) => e.id === 'CURSED_BACKDO') ? ' (저주의 빽도)' : ''}
          </button>
        )}
        {myTurn && phase === 'THROW' && v.chooseThrow && (
          <div className="yut-choose">
            <span className="room-hint">골라 던져! 결과를 고르세요 (윷·모도 추가 던지기 없음)</span>
            <div className="yut-choose-buttons">
              {THROW_CHOICES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="btn yut-chip-btn"
                  onClick={() => onAction({ type: 'throw', result: t })}
                >
                  {THROW_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {hint && !animating && <p className="room-hint yut-hint">{hint}</p>}
        {eventNote && !animating && !hint && <p className="room-hint yut-hint">{eventNote}</p>}
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
          <li key={p.id} className={`${p.id === actor && !v.ended ? 'current' : ''} ${p.resigned ? 'resigned' : ''}`}>
            <CharacterAvatar id={characterOf(p.id)} size={24} />
            <span className="yut-player-name">
              {nameOf(p.id)}
              {p.bot && !p.resigned && <span className="room-done"> 봇</span>}
              {p.resigned && <span className="room-done"> 항복</span>}
            </span>
            {!p.resigned && (
              <span className="yut-player-pieces">
                {p.pieces.map((pc) => (
                  <i key={pc.id} className={pc.finished ? 'done' : pc.path ? 'board' : 'wait'} />
                ))}
              </span>
            )}
          </li>
        ))}
      </ol>
      {!v.ended && mePlayer && !mePlayer.resigned && (
        <button type="button" className="btn btn-ghost btn-small yut-surrender" onClick={surrender}>
          항복
        </button>
      )}
    </div>
  )

  function clickDest(node: number) {
    const ms = candidates.filter((m) => m.dest === node)
    if (ms.length === 1) confirm(ms[0])
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
  armed: string | null
}

function resultLabel(ms: YutMove[]): string {
  return Array.from(new Set(ms.map((m) => rolledLabel({ result: m.result, steps: m.steps })))).join('/')
}

interface DisplayPiece {
  id: number
  node: number
  moving: boolean
}

interface Motion {
  overrides: Record<string, number>
  linger: { playerId: string; id: number; node: number }[]
  captures: { key: string; playerId: string; node: number }[]
  blocks: { key: string; node: number }[]
}

function pieceKey(playerId: string, id: number): string {
  return `${playerId}:${id}`
}

function displayPieces(p: { id: string; pieces: YutPieceView[] }, motion: Motion): DisplayPiece[] {
  const out: DisplayPiece[] = []
  for (const pc of p.pieces) {
    const override = motion.overrides[pieceKey(p.id, pc.id)]
    if (override !== undefined) out.push({ id: pc.id, node: override, moving: true })
    else if (!pc.finished && pc.node >= 0) out.push({ id: pc.id, node: pc.node, moving: false })
  }
  for (const l of motion.linger) if (l.playerId === p.id) out.push({ id: l.id, node: l.node, moving: false })
  return out
}

function groupPieces(pieces: DisplayPiece[]) {
  const groups = new Map<string, { node: number; ids: number[]; moving: boolean }>()
  for (const p of pieces) {
    const key = `${p.node}:${p.moving}`
    const g = groups.get(key) ?? { node: p.node, ids: [], moving: p.moving }
    g.ids.push(p.id)
    groups.set(key, g)
  }
  return [...groups.values()]
}

/** 서버 판 변화를 한 칸씩 걷는 연출로 바꾼다. 잡힌 말은 잡는 말이 도착할 때까지 남겨 뒀다가 터뜨린다 */
type MotionStep = [number, (m: Motion) => Motion]
interface MotionPlan {
  initial: Motion
  timeline: MotionStep[]
}
const IDLE: Motion = { overrides: {}, linger: [], captures: [], blocks: [] }

function planMotion(prev: YutView, v: YutView): MotionPlan | null {
  const ev = v.lastEvent
  const card = ev?.type === 'card' ? (ev.card as { id?: string } | undefined) : undefined
  if (card?.id === 'RELEASE' || ev?.type === 'surrender') return null
  const overrides: Record<string, number> = {}
  const timeline: MotionStep[] = []
  let arrival = 0
  for (const p of v.players) {
    const before = prev.players.find((x) => x.id === p.id)
    if (!before) continue
    for (const pc of p.pieces) {
      const old = before.pieces.find((x) => x.id === pc.id)
      if (!old || old.finished) continue
      const entering = old.path === null && pc.path !== null
      if (!entering && (old.path === null || (old.path === pc.path && old.index === pc.index && !pc.finished))) continue
      const route = stepsBetween(old.path ?? 'RING', old.path === null ? 0 : old.index, pc)
      if (route.length === 0) continue
      const key = pieceKey(p.id, pc.id)
      overrides[key] = old.path === null ? 0 : old.node
      route.forEach((node, i) =>
        timeline.push([(i + 1) * STEP_MS, (m) => ({ ...m, overrides: { ...m.overrides, [key]: node } })]),
      )
      const done = (route.length + 1) * STEP_MS
      arrival = Math.max(arrival, done)
      timeline.push([
        done,
        (m) => {
          const next = { ...m.overrides }
          delete next[key]
          return { ...m, overrides: next }
        },
      ])
    }
  }
  const linger: Motion['linger'] = []
  if (ev && ev.captured === true && typeof ev.dest === 'number' && typeof ev.player === 'string') {
    for (const p of prev.players) {
      if (p.id === ev.player) continue
      for (const pc of p.pieces) {
        if (pc.node !== ev.dest || pc.path === null) continue
        const now = v.players.find((x) => x.id === p.id)?.pieces.find((x) => x.id === pc.id)
        if (now && now.path === null) linger.push({ playerId: p.id, id: pc.id, node: pc.node })
      }
    }
  }
  const blocked = ev && ev.blocked === true && typeof ev.dest === 'number' ? (ev.dest as number) : null
  if (Object.keys(overrides).length === 0 && linger.length === 0 && blocked === null) return null
  if (blocked !== null) {
    const key = `block:${blocked}:${Date.now()}`
    timeline.push([arrival, (m) => ({ ...m, blocks: [...m.blocks, { key, node: blocked }] })])
    timeline.push([arrival + BLOCK_MS, (m) => ({ ...m, blocks: m.blocks.filter((b) => b.key !== key) })])
  }
  if (linger.length > 0) {
    const captures = linger.map((l) => ({
      key: `${pieceKey(l.playerId, l.id)}:${Date.now()}`,
      playerId: l.playerId,
      node: l.node,
    }))
    timeline.push([arrival, (m) => ({ ...m, linger: [], captures })])
    timeline.push([arrival + CAPTURE_MS, (m) => ({ ...m, captures: [] })])
  }
  return { initial: { overrides, linger, captures: [], blocks: [] }, timeline }
}

function useMotion(v: YutView): { motion: Motion; settling: boolean } {
  const [state, setState] = useState<{ v: YutView | null; plan: MotionPlan | null; motion: Motion }>({
    v: null,
    plan: null,
    motion: IDLE,
  })
  if (state.v !== v) {
    const plan = state.v ? planMotion(state.v, v) : null
    setState({ v, plan, motion: plan ? plan.initial : IDLE })
  }
  const plan = state.plan
  useEffect(() => {
    if (!plan) return
    const timers = plan.timeline.map(([at, apply]) =>
      window.setTimeout(() => setState((s) => ({ ...s, motion: apply(s.motion) })), at),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [plan])
  return { motion: state.motion, settling: state.v !== v }
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
