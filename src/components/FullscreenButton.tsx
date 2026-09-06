import { useFullscreen } from '../lib/useFullscreen'

// iPhone Safari 는 Fullscreen API 가 없어서 버튼 자체를 숨긴다.
export function FullscreenButton() {
  const { supported, active, toggle } = useFullscreen()
  if (!supported) return null
  return (
    <button
      type="button"
      className="icon-btn play-fullscreen"
      onClick={() => void toggle()}
      aria-label={active ? '전체 화면 해제' : '전체 화면'}
      title={active ? '전체 화면 해제 (ESC)' : '전체 화면'}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        {active ? (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
          />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
          />
        )}
      </svg>
    </button>
  )
}
