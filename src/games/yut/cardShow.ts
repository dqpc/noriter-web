import { useEffect, useState } from 'react'
import type { YutCardInfo, YutView } from './board'

const INTRO_MS = 1100
const DEAL_MS = 4300
const REVEAL_FALLBACK_MS = 20000
const REVEAL_HURRY_MS = 2500

export interface CardShow {
  pileKey: string
  player: string
  trigger: string
  stage: 'intro' | 'deal' | 'pick' | 'reveal'
  picked: number | null
  card: YutCardInfo | null
  since: number | null
  /** 다음 진행이 기다리는 중이라 잠시 후 자동으로 닫힘 */
  hurry: boolean
}

/** 서버 판 상태에서 카드 연출 단계를 만든다. 더미 만들기 → 고르기 → 공개 순서로, 공개는 누를 때까지 남긴다. 단 다음 더미가 기다리거나 보는 사람이 움직일 차례면 잠시 후 자동으로 닫는다 */
export function useCardShow(
  v: YutView,
  busy: boolean,
  mustAct: boolean,
): { show: CardShow | null; dismiss: () => void } {
  const [show, setShow] = useState<CardShow | null>(null)
  const [seenPile, setSeenPile] = useState('')
  const [seenReveal, setSeenReveal] = useState('')
  const pileKey = v.card ? `${v.card.player}:${v.card.trigger}:${v.deadline ?? ''}` : ''
  const ev = v.lastEvent
  const revealKey = ev?.type === 'card' ? JSON.stringify(ev) : ''

  if (revealKey && revealKey !== seenReveal) {
    setSeenReveal(revealKey)
    setShow({
      pileKey: show?.pileKey ?? '',
      player: String(ev.player),
      trigger: String(ev.trigger),
      stage: 'reveal',
      picked: typeof ev.index === 'number' ? ev.index : 0,
      card: ev.card as YutCardInfo,
      since: null,
      hurry: false,
    })
  } else if (pileKey && pileKey !== seenPile && !busy && (show === null || show.stage !== 'reveal')) {
    setSeenPile(pileKey)
    setShow({
      pileKey,
      player: v.card!.player,
      trigger: v.card!.trigger,
      stage: 'intro',
      picked: null,
      card: null,
      since: null,
      hurry: false,
    })
  } else if (!pileKey && show && show.stage !== 'reveal' && !revealKey) {
    setShow(null)
  }

  const pilePending = pileKey !== '' && pileKey !== seenPile
  const hurry = show?.stage === 'reveal' && (pilePending || mustAct)
  if (show && show.stage === 'reveal' && show.hurry !== hurry) setShow({ ...show, hurry })

  const stage = show?.stage
  const key = show?.pileKey
  const since = show?.since
  useEffect(() => {
    if (stage === 'reveal' && since === null)
      setShow((s) => (s && s.stage === 'reveal' ? { ...s, since: Date.now() } : s))
  }, [stage, since])
  useEffect(() => {
    if (stage === 'intro') {
      const t = window.setTimeout(
        () => setShow((s) => (s && s.stage === 'intro' ? { ...s, stage: 'deal' } : s)),
        INTRO_MS,
      )
      return () => window.clearTimeout(t)
    }
    if (stage === 'deal') {
      const t = window.setTimeout(
        () => setShow((s) => (s && s.stage === 'deal' ? { ...s, stage: 'pick' } : s)),
        DEAL_MS,
      )
      return () => window.clearTimeout(t)
    }
    if (stage === 'reveal' && since !== null && since !== undefined) {
      const wait = hurry ? Math.max(0, since + REVEAL_HURRY_MS - Date.now()) : REVEAL_FALLBACK_MS
      const t = window.setTimeout(() => setShow((s) => (s && s.stage === 'reveal' ? null : s)), wait)
      return () => window.clearTimeout(t)
    }
  }, [stage, key, hurry, since])
  const dismiss = () => setShow((s) => (s && s.stage === 'reveal' ? null : s))
  return { show, dismiss }
}
