import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameHost, GameOptions } from '../types'
import { displaySteps, newStairs, press, tick, type Action, type StairsState } from './logic'
import { ClimbIcon, TurnIcon } from './icons'

import { getMyCharacter } from '../../characters'
import { drawWith } from './draw'
import { drawEffect, effectFor, type Effect } from './effects'

const reduceMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function draw(canvas: HTMLCanvasElement, state: StairsState, options?: GameOptions, effect: Effect | null = null) {
  drawWith(
    canvas,
    state.steps,
    state.facing,
    state.energy,
    state.rules.maxEnergy,
    state.dirAt,
    state.itemAt,
    displaySteps(state, performance.now()),
    typeof options?.character === 'string' ? options.character : getMyCharacter(),
  )
  drawEffect(canvas, effect, performance.now(), reduceMotion())
}

const localSeed = () => Math.floor(Math.random() * 2147483646) + 1

function readSeed(options?: GameOptions): number {
  const seed = Number(options?.seed)
  return Number.isInteger(seed) && seed > 0 ? seed : localSeed()
}

export function GameStairs({ host, options }: { host: GameHost; options?: GameOptions }) {
  // 방은 frozen 을 항상 넘긴다. 혼자 하기도 서버 seed 를 받으므로 seed 유무로는 구분할 수 없다
  const roomMode = options?.frozen !== undefined
  const frozen = options?.frozen === true
  const [initial] = useState(() => newStairs(readSeed(options), performance.now(), roomMode && !frozen))
  const stateRef = useRef<StairsState>(initial)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const effectRef = useRef<Effect | null>(null)
  const [steps, setSteps] = useState(0)
  const [ended, setEnded] = useState<{ fell: boolean } | null>(null)

  const frame = useCallback(
    function frame() {
      const s = tick(stateRef.current, performance.now())
      const wasEnded = stateRef.current.ended
      stateRef.current = s
      if (s.ended) effectRef.current = null
      const canvas = canvasRef.current
      if (canvas) draw(canvas, s, options, effectRef.current)
      if (s.ended && !wasEnded) setEnded({ fell: s.fell })
      if (!s.ended) rafRef.current = requestAnimationFrame(frame)
    },
    [options],
  )

  const input = useCallback(
    (action: Action) => {
      const before = stateRef.current
      if (before.ended || frozen) return
      const now = performance.now()
      const after = press(before, action, now)
      stateRef.current = after
      effectRef.current = effectFor(before, after, now) ?? effectRef.current
      if (after.steps !== before.steps) setSteps(after.steps)
      host.onState?.({
        steps: after.steps,
        facing: after.facing,
        energy: after.energy,
        ended: after.ended,
        fell: after.fell,
      })
      if (after.ended) {
        setEnded({ fell: after.fell })
        const canvas = canvasRef.current
        if (canvas) draw(canvas, after, options)
      } else if (before.startedAt === null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(frame)
      }
    },
    [frame, options, host, frozen],
  )

  const restart = useCallback(() => {
    const begin = (seed: number) => {
      cancelAnimationFrame(rafRef.current)
      stateRef.current = newStairs(seed, performance.now(), roomMode)
      effectRef.current = null
      setSteps(0)
      setEnded(null)
      const canvas = canvasRef.current
      if (canvas) draw(canvas, stateRef.current, options)
      if (roomMode) rafRef.current = requestAnimationFrame(frame)
    }
    // 혼자 하기는 판마다 서버 세션(seed)을 새로 받는다. 못 받으면 로컬 seed 로 그냥 시작
    if (host.startPlay) void host.startPlay().then((seed) => begin(seed ?? localSeed()))
    else begin(readSeed(options))
  }, [host, options, roomMode, frame])

  useEffect(() => {
    if (!roomMode) return
    const s = stateRef.current
    if (!frozen && s.startedAt === null && !s.ended) {
      const now = performance.now()
      stateRef.current = { ...s, startedAt: now, updatedAt: now }
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(frame)
    }
    if (frozen && s.startedAt !== null && !s.ended) {
      cancelAnimationFrame(rafRef.current)
      stateRef.current = { ...tick(s, performance.now()), ended: true }
      setEnded({ fell: false })
    }
  }, [frozen, roomMode, frame])

  useEffect(() => {
    host.onScore(steps)
  }, [host, steps])
  useEffect(() => {
    if (ended) {
      const s = stateRef.current
      host.onGameOver(s.steps, { won: false, elapsedMs: s.startedAt === null ? 0 : s.updatedAt - s.startedAt })
    }
  }, [host, ended])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw(canvas, stateRef.current, options)
    if (stateRef.current.startedAt !== null) rafRef.current = requestAnimationFrame(frame)
    const ro = new ResizeObserver(() => draw(canvas, stateRef.current, options))
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [options, frame])

  useEffect(() => {
    const held = new Set<string>()
    const keyOf = (e: KeyboardEvent) =>
      e.key === 'Shift' ? 'TURN' : e.key === ' ' || e.code === 'Space' ? 'CLIMB' : null
    const onDown = (e: KeyboardEvent) => {
      const k = keyOf(e)
      if (!k) return
      e.preventDefault()
      if (e.repeat || held.has(k)) return
      held.add(k)
      input(k)
    }
    const onUp = (e: KeyboardEvent) => {
      const k = keyOf(e)
      if (k) held.delete(k)
    }
    const onBlur = () => held.clear()
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [input])

  return (
    <div className="stairs">
      <div className="stairs-board-wrap">
        <canvas ref={canvasRef} className="stairs-board" aria-label="계단" />
        {steps === 0 && !ended && (
          <div className="stairs-tip" aria-live="polite">
            <p className="stairs-tip-title">조작</p>
            <p>
              <kbd>Shift</kbd> 방향 전환 · <kbd>Space</kbd> 오르기
              <br />
              <small>모바일은 아래 왼쪽·오른쪽 버튼</small>
            </p>
            <p className="stairs-tip-dash">
              <b>대시</b> 방향을 바꾸고 <em>바로</em> 오르면 4칸을 한 번에 뛰어요
            </p>
            <p className="stairs-tip-sub">번개를 밟으면 에너지가 가득 찹니다</p>
          </div>
        )}
        {ended && (
          <div className="g2048-overlay">
            <p>{ended.fell ? '떨어졌다!' : '지쳤다…'}</p>
            <p className="g2048-final">{steps} 칸</p>
            {!roomMode && (
              <button type="button" className="btn" onClick={restart}>
                다시 하기
              </button>
            )}
          </div>
        )}
      </div>
      <div className="stairs-pads">
        <button
          type="button"
          className="stairs-pad"
          onPointerDown={(e) => {
            e.currentTarget.blur()
            input('TURN')
          }}
          onKeyDown={(e) => e.preventDefault()}
          aria-label="방향 전환"
        >
          <TurnIcon />
        </button>
        <button
          type="button"
          className="stairs-pad"
          onPointerDown={(e) => {
            e.currentTarget.blur()
            input('CLIMB')
          }}
          onKeyDown={(e) => e.preventDefault()}
          aria-label="오르기"
        >
          <ClimbIcon />
        </button>
      </div>
      <p className="g2048-help">
        보는 방향에 계단이 있으면 오르기, 반대쪽이면 방향 전환. 키보드는 Shift 와 스페이스. 방향 전환 직후 바로 오르면
        대시(4칸). 번개를 밟으면 에너지가 가득 찹니다.
      </p>
    </div>
  )
}
