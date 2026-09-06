// 전체 화면은 문서 전체를 대상으로 건다. 게임 요소만 걸면 채팅·오버레이가 밖으로 빠져 버린다.
const BODY_CLASS = 'fullscreen'

export function isFullscreenSupported(): boolean {
  return typeof document !== 'undefined' && !!document.fullscreenEnabled
}

export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement != null
}

export async function toggleFullscreen(): Promise<void> {
  if (!isFullscreenSupported()) return
  try {
    if (isFullscreen()) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
  } catch {
    // 사용자 제스처 밖이거나 브라우저가 거부한 경우. 조용히 무시한다.
  }
}

export function syncFullscreenClass(): void {
  document.body.classList.toggle(BODY_CLASS, isFullscreen())
}
