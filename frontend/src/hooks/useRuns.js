import { useState, useEffect, useCallback } from 'react'
import { getRuns } from '../api'

export function useRuns() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRuns = useCallback(async () => {
    try {
      const data = await getRuns()
      setRuns(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
    // Poll every 5s so status updates without manual refresh
    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  return { runs, loading, error, refetch: fetchRuns }
}
