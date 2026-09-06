// Kakao SDK for JavaScript 2.8.3 (2026-09-03). 버전을 올리면 integrity 도 같이 바꾼다
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js'
const SDK_INTEGRITY = 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy'

const KEY = import.meta.env.VITE_KAKAO_JS_KEY
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? window.location.origin).replace(/\/$/, '')

interface KakaoLink {
  mobileWebUrl: string
  webUrl: string
}

interface KakaoSdk {
  isInitialized(): boolean
  init(key: string): void
  Share: {
    sendDefault(settings: {
      objectType: 'feed'
      content: {
        title: string
        description: string
        imageUrl: string
        imageWidth?: number
        imageHeight?: number
        link: KakaoLink
      }
      buttons: { title: string; link: KakaoLink }[]
      installTalk?: boolean
    }): void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoSdk
  }
}

/** 키가 없으면 버튼을 숨긴다 — 키는 배포 환경변수로만 들어온다 */
export const kakaoShareAvailable = Boolean(KEY)

let loading: Promise<KakaoSdk> | null = null

function loadSdk(): Promise<KakaoSdk> {
  if (window.Kakao) return Promise.resolve(window.Kakao)
  loading ??= new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.integrity = SDK_INTEGRITY
    script.crossOrigin = 'anonymous'
    script.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error('Kakao SDK missing')))
    script.onerror = () => {
      loading = null
      reject(new Error('Kakao SDK load failed'))
    }
    document.head.append(script)
  })
  return loading
}

export interface KakaoShareInput {
  title: string
  description: string
  /** 사이트 안 경로. 절대 주소는 VITE_SITE_URL 로 만든다 */
  path: string
  buttonTitle: string
}

/** 카카오톡 피드 카드로 공유. 실패는 호출 쪽에서 안내한다 */
export async function shareToKakao(input: KakaoShareInput): Promise<void> {
  if (!KEY) throw new Error('VITE_KAKAO_JS_KEY missing')
  const kakao = await loadSdk()
  if (!kakao.isInitialized()) kakao.init(KEY)
  const url = `${SITE_URL}${input.path}`
  const link = { mobileWebUrl: url, webUrl: url }
  kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: input.title,
      description: input.description,
      // 크기를 안 주면 카톡이 정사각형으로 잘라 보여준다
      imageUrl: `${SITE_URL}/og.png`,
      imageWidth: 1200,
      imageHeight: 630,
      link,
    },
    buttons: [{ title: input.buttonTitle, link }],
    installTalk: true,
  })
}
