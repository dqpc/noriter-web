import { Link } from 'react-router-dom'

/** 게임 화면에서 홈까지 뒤로가기 두 번은 불편해서 바로 가는 버튼 */
export function HomeButton() {
  return (
    <Link to="/" className="icon-btn play-home" aria-label="홈으로" title="홈으로">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6"
        />
      </svg>
    </Link>
  )
}
