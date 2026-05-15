import { useEffect, useState } from 'react'
import api from '../api'

/**
 * Hook for /stats/public — the aggregates we show on auth + landing pages.
 *
 * Public endpoint, no auth required. Falls back gracefully if the backend
 * is reachable but the DB is down (the endpoint returns all-nulls).
 *
 * Caches in module scope across mounts so visiting Login → Signup → Login
 * doesn't refetch.
 */
let _cache = null
let _cacheAt = 0
const TTL_MS = 60 * 1000  // 1 minute

export default function usePublicStats() {
  const [stats, setStats] = useState(_cache)
  const [loading, setLoading] = useState(_cache == null)

  useEffect(() => {
    const fresh = _cache && (Date.now() - _cacheAt < TTL_MS)
    if (fresh) {
      setStats(_cache)
      setLoading(false)
      return
    }
    let cancelled = false
    api.get('/stats/public')
      .then(r => {
        if (cancelled) return
        _cache = r.data
        _cacheAt = Date.now()
        setStats(r.data)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { stats, loading }
}
