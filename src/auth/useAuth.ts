import { useContext, useEffect } from 'react'
import type { Activity } from '../lib/auth'
import { AuthContext, type AuthState } from './context'

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}

/** 이 페이지에 있는 동안의 활동을 서버에 알린다 (친구 목록에 "윷놀이 대기실" 처럼 보임) */
export function useActivity(activity: Activity, gameId?: string, roomId?: string): void {
  const { setActivity, me } = useAuth()
  useEffect(() => {
    if (!me) return
    setActivity({ activity, gameId, roomId })
    return () => setActivity(null)
  }, [activity, gameId, roomId, me, setActivity])
}
