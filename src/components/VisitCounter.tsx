import { useEffect, useState } from 'react'
import { trackVisit, type VisitStats } from '../lib/visits'

export function VisitCounter() {
  const [stats, setStats] = useState<VisitStats | null>(null)
  useEffect(() => {
    let cancelled = false
    trackVisit()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  if (!stats) return null
  return (
    <span className="visits" title="브라우저 기준, 하루 한 번 집계">
      오늘 <b>{stats.today.toLocaleString()}</b> · 전체 <b>{stats.total.toLocaleString()}</b>
    </span>
  )
}
