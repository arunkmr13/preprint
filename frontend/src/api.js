const BASE = 'http://localhost:8000'

export async function getRuns() {
  const res = await fetch(`${BASE}/runs`)
  if (!res.ok) throw new Error('Failed to fetch runs')
  return res.json()
}

export async function getRun(runId) {
  const res = await fetch(`${BASE}/runs/${runId}`)
  if (!res.ok) throw new Error('Run not found')
  return res.json()
}

export async function createRun(payload) {
  const res = await fetch(`${BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to start run')
  }
  return res.json()
}

export async function deleteRun(runId) {
  const res = await fetch(`${BASE}/runs/${runId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete run')
  return res.json()
}

export async function getCheckpoint(platform) {
  const res = await fetch(`${BASE}/checkpoint/${platform}`)
  if (!res.ok) throw new Error('Failed to fetch checkpoint')
  return res.json()
}

export async function clearCheckpoint(platform) {
  const res = await fetch(`${BASE}/checkpoint/${platform}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to clear checkpoint')
  return res.json()
}

export function streamLogs(runId, onLog, onDone) {
  const es = new EventSource(`${BASE}/runs/${runId}/logs`)

  es.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'log') {
      onLog(data)
    } else if (data.type === 'done') {
      onDone(data)
      es.close()
    }
  }

  es.onerror = () => {
    es.close()
    onDone({ type: 'done', status: 'error' })
  }

  return () => es.close()
}
