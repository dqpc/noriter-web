import { afterEach, describe, expect, it, vi } from 'vitest'
import { isFullscreen, isFullscreenSupported, syncFullscreenClass, toggleFullscreen } from './fullscreen'

function mockFullscreen(enabled: boolean, element: Element | null) {
  Object.defineProperty(document, 'fullscreenEnabled', { value: enabled, configurable: true })
  Object.defineProperty(document, 'fullscreenElement', { value: element, configurable: true })
}

afterEach(() => {
  document.body.classList.remove('fullscreen')
  vi.restoreAllMocks()
})

describe('fullscreen', () => {
  it('iPhone 처럼 API 가 없으면 지원 안 함으로 본다', () => {
    mockFullscreen(false, null)
    expect(isFullscreenSupported()).toBe(false)
    expect(isFullscreen()).toBe(false)
  })

  it('전체 화면 여부에 따라 body 클래스를 맞춘다', () => {
    mockFullscreen(true, document.documentElement)
    syncFullscreenClass()
    expect(document.body.classList.contains('fullscreen')).toBe(true)

    mockFullscreen(true, null)
    syncFullscreenClass()
    expect(document.body.classList.contains('fullscreen')).toBe(false)
  })

  it('켜져 있으면 끄고, 꺼져 있으면 문서 전체를 전체 화면으로 요청한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const exit = vi.fn().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = request
    document.exitFullscreen = exit

    mockFullscreen(true, null)
    await toggleFullscreen()
    expect(request).toHaveBeenCalledTimes(1)
    expect(exit).not.toHaveBeenCalled()

    mockFullscreen(true, document.documentElement)
    await toggleFullscreen()
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('브라우저가 거부해도 예외를 밖으로 던지지 않는다', async () => {
    document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'))
    mockFullscreen(true, null)
    await expect(toggleFullscreen()).resolves.toBeUndefined()
  })
})
