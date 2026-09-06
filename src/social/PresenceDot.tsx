import type { PresenceState } from '../lib/auth'

/** 접속 상태 마름모. 온라인 초록 · 자리 비움 노랑 · 바쁨 빨강 · 오프라인 회색 */
export function PresenceDot({ state, size = 10 }: { state: PresenceState; size?: number }) {
  return <i className={`presence-dot ${state.toLowerCase()}`} style={{ width: size, height: size }} aria-hidden />
}
