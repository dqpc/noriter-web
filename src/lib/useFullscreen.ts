import { useEffect, useState } from 'react'
import { isFullscreen, isFullscreenSupported, syncFullscreenClass, toggleFullscreen } from './fullscreen'

export function useFullscreen() {
  const [active, setActive] = useState(isFullscreen)
  useEffect(() => {
    const onChange = () => {
      syncFullscreenClass()
      setActive(isFullscreen())
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      // 게임 화면을 떠나면 클래스만 정리한다. 전체 화면 자체는 사용자가 ESC 로 푼다.
      syncFullscreenClass()
    }
  }, [])
  return { supported: isFullscreenSupported(), active, toggle: toggleFullscreen }
}
