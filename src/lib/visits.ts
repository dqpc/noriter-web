import { API_URL } from './api'
import { getPreference, setPreference } from './storage'

export interface VisitStats {
  today: number
  total: number
}

function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

export async function trackVisit(): Promise<VisitStats> {
  const seen = getPreference('site', 'visitDay') === todayKey()
  const res = await fetch(`${API_URL}/api/visits`, { method: seen ? 'GET' : 'POST' })
  if (!res.ok) throw new Error(`visits ${res.status}`)
  if (!seen) setPreference('site', 'visitDay', todayKey())
  return res.json()
}
