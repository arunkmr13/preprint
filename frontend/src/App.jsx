import React, { useState } from 'react'
import { Database, Activity, GitBranch } from 'lucide-react'
import RunForm from './components/RunForm'
import LiveRun from './components/LiveRun'
import RunHistory from './components/RunHistory'
import { useRuns } from './hooks/useRuns'

export default function App() {
  const { runs, loading, refetch } = useRuns()
  const [activeRun, setActiveRun] = useState(null)

  const handleRunStarted = (run) => {
    setActiveRun(run)
    refetch()
  }

  const handleSelect = (run) => {
    setActiveRun(run)
  }

  // Keep activeRun in sync with polled data
  const liveActiveRun = activeRun
    ? (runs.find(r => r.run_id === activeRun.run_id) || activeRun)
    : null

  const runningCount = runs.filter(r => r.status === 'running').length
  const totalDocs = runs.reduce((acc, r) => acc + (r.stats?.documents_inserted || 0), 0)
  const totalErrors = runs.reduce((acc, r) => acc + (r.stats?.errors || 0), 0)

  const sectionLabel = {
    fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
  }
  const card = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '1.25rem',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', gap: 16, height: 52,
      }}>
        <Database size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 500, fontSize: 14, letterSpacing: '0.02em' }}>Preprint Pipeline</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>bioRxiv · medRxiv → MongoDB</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: runningCount > 0 ? 'var(--amber)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {runningCount}
            </span> running
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{totalDocs.toLocaleString()}</span> docs total
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: totalErrors > 0 ? 'var(--red)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{totalErrors}</span> errors
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* New run */}
        <div>
          <div style={sectionLabel}>New run</div>
          <div style={card}>
            <RunForm onRunStarted={handleRunStarted} />
          </div>
        </div>

        {/* Active run monitor */}
        {liveActiveRun && (
          <div>
            <div style={sectionLabel}>Active run</div>
            <LiveRun run={liveActiveRun} onClose={() => setActiveRun(null)} />
          </div>
        )}

        {/* History */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={sectionLabel}>Run history ({runs.length})</span>
            {loading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>refreshing…</span>}
          </div>
          <RunHistory runs={runs} onSelect={handleSelect} onDeleted={refetch} />
        </div>

      </div>
    </div>
  )
}
