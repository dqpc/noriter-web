import type { ComponentType } from 'react'

/** 게임이 포털에 알려 주는 이벤트. 리더보드/진행도 저장은 포털이 담당한다. */
export interface GameHost {
  /** 점수가 바뀔 때마다 호출 */
  onScore: (score: number) => void
  /** 게임이 끝났을 때 최종 점수와 함께 호출 */
  onGameOver: (score: number) => void
}

export interface GameDefinition {
  /** URL 과 저장 키에 쓰이는 식별자 (예: "2048") */
  id: string
  name: string
  description: string
  /** 게임 화면 컴포넌트. host 를 통해 포털과 통신한다. */
  Component: ComponentType<{ host: GameHost }>
}
