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
    <dl className="visits" title="브라우저 기준, 하루 한 번 집계">
      <dt>오늘 방문</dt>
      <dd className="visits-today">{stats.today.toLocaleString()}</dd>
      <dt>전체 방문</dt>
      <dd>{stats.total.toLocaleString()}</dd>
    </dl>
  )
}
