import { useState } from 'react'
import { CharacterPicker, getMyCharacter } from '../characters'
import { Gate } from './Gate'
import { useAuth } from './useAuth'

/** 공유 링크로 홈을 건너뛰고 들어와도 닉네임 게이트를 지나게 한다 */
export function RequireIdentity({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(getMyCharacter)
  if (auth.me === undefined) {
    return (
      <section className="page">
        <p className="room-hint">로그인 확인 중…</p>
      </section>
    )
  }
  if (auth.identified) return children
  return (
    <section className="page">
      <Gate onPick={() => setPicking(true)} />
      {picking && (
        <CharacterPicker
          value={picked}
          onChange={(id) => {
            auth.changeCharacter(id)
            setPicked(id)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}
