import type { CSSProperties } from 'react'
import type { CardShow } from './cardShow'

const DEAL_STAGGER_MS = 160
const PILE = 5

export function YutCards({
  show,
  me,
  nameOf,
  remainMs,
  onPick,
}: {
  show: CardShow
  me: string | null
  nameOf: (id: string) => string
  remainMs: number
  onPick: (index: number) => void
}) {
  const mine = show.player === me
  const canPick = show.stage === 'pick' && mine
  const title = show.trigger === 'OPENING' ? '시작 카드' : show.trigger === 'CAPTURE' ? '잡기 보상' : '방 도착 보상'
  return (
    <div
      className={`yut-cards stage-${show.stage} ${show.card ? `kind-${show.card.kind.toLowerCase()}` : ''}`}
      role="dialog"
    >
      <div className="yut-cards-head">
        <span className="yut-cards-title">{title}</span>
        <span className="yut-cards-who">
          {show.stage === 'reveal'
            ? `${nameOf(show.player)} 님의 카드`
            : mine
              ? show.stage === 'pick'
                ? `카드 한 장을 고르세요 · ${Math.ceil(remainMs / 1000)}s`
                : show.stage === 'deal'
                  ? '천사 4장 + 악마 1장을 섞는 중'
                  : '천사 덱과 악마 덱'
              : show.stage === 'pick'
                ? `${nameOf(show.player)} 님이 고르는 중 · ${Math.ceil(remainMs / 1000)}s`
                : show.stage === 'deal'
                  ? `${nameOf(show.player)} 님의 더미를 섞는 중`
                  : `${nameOf(show.player)} 님의 카드 뽑기`}
        </span>
      </div>
      {show.stage === 'intro' && (
        <div className="yut-cards-intro" aria-hidden>
          <span className="yut-cards-intro-text">카드 뽑기!</span>
          <span className="yut-cards-intro-sub">{title}</span>
        </div>
      )}
      {(show.stage === 'intro' || show.stage === 'deal') && (
        <>
          <div className="yut-deck angel">
            <span>천사 덱</span>
            <i className="yut-deck-count">4장</i>
          </div>
          <div className="yut-deck devil">
            <span>악마 덱</span>
            <i className="yut-deck-count">1장</i>
          </div>
        </>
      )}
      <div className="yut-fan">
        {Array.from({ length: PILE }, (_, i) => {
          const fromDevil = i === PILE - 1
          const picked = show.picked === i
          const cls = [
            'yut-card',
            show.stage === 'deal' ? 'dealing' : show.stage === 'intro' ? 'hidden-card' : '',
            canPick ? 'pickable' : '',
            show.stage === 'reveal' ? (picked ? 'picked' : 'faded') : '',
          ].join(' ')
          const slotX = 50 + (i - 2) * 19
          const style = {
            '--i': i,
            '--sx': `${(fromDevil ? 87.5 : 12.5) - slotX}cqw`,
            '--cx': `${50 - slotX}cqw`,
            '--dl': `${i * DEAL_STAGGER_MS}ms`,
          } as CSSProperties
          return (
            <button
              key={i}
              type="button"
              className={cls}
              style={style}
              disabled={!canPick}
              onClick={() => canPick && onPick(i)}
              aria-label={`카드 ${i + 1}`}
            >
              <span className="yut-card-back">
                <span className="yut-card-mark">?</span>
              </span>
              {picked && show.card && (
                <span className={`yut-card-face ${show.card.kind.toLowerCase()}`}>
                  <span className="yut-card-kind">{show.card.kind === 'ANGEL' ? '천사의 카드' : '악마의 카드'}</span>
                  <span className="yut-card-icon">{show.card.kind === 'ANGEL' ? '😇' : '😈'}</span>
                  <span className="yut-card-label">{show.card.label}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      {show.stage === 'reveal' && show.card && (
        <div className="yut-card-desc">
          <b>{show.card.label}</b>
          <span>{show.card.description}</span>
        </div>
      )}
    </div>
  )
}
