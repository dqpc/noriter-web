import { useEffect, useState } from 'react'
import type { YutCardInfo, YutView } from './board'

const INTRO_MS = 1100
const DEAL_MS = 3400
const DEAL_STAGGER_MS = 160
const REVEAL_MS = 2400
const PILE = 5

export interface CardShow {
  pileKey: string
  player: string
  trigger: string
  stage: 'intro' | 'deal' | 'pick' | 'reveal'
  picked: number | null
  card: YutCardInfo | null
}

/** 서버 판 상태에서 카드 연출 단계를 만든다. 더미 만들기 → 고르기 → 공개 순서로, 공개는 판이 다음 단계로 넘어가도 끝까지 보여준다 */
export function useCardShow(v: YutView, busy: boolean): CardShow | null {
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
    })
  } else if (pileKey && pileKey !== seenPile && !busy && (show === null || show.stage !== 'reveal')) {
    setSeenPile(pileKey)
    setShow({ pileKey, player: v.card!.player, trigger: v.card!.trigger, stage: 'intro', picked: null, card: null })
  } else if (!pileKey && show && show.stage !== 'reveal' && !revealKey) {
    setShow(null)
  }

  const stage = show?.stage
  const key = show?.pileKey
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
        DEAL_MS + DEAL_STAGGER_MS * PILE,
      )
      return () => window.clearTimeout(t)
    }
    if (stage === 'reveal') {
      const t = window.setTimeout(() => setShow((s) => (s && s.stage === 'reveal' ? null : s)), REVEAL_MS)
      return () => window.clearTimeout(t)
    }
  }, [stage, key])
  return show
}
