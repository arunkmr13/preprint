import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { streamLogs } from '../api'
import StatusBadge from './StatusBadge'

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-input)', borderRadius: 'var(--radius)',
      padding: '10px 14px', minWidth: 90,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</div>
    </div>
  )
}

export default function LiveRun({ run, onClose }) {
  const [logs, setLogs] = useState([])
  const [finalStats, setFinalStats] = useState(run.stats || null)
  const [status, setStatus] = useState(run.status)
  const logRef = useRef(null)

  useEffect(() => {
    if (run.status !== 'running') {
      setFinalStats(run.stats)
      return
    }

    const stop = streamLogs(
      run.run_id,
      (msg) => setLogs(prev => [...prev, msg]),
      (done) => {
        setStatus(done.status || 'completed')
        if (done.stats) setFinalStats(done.stats)
      }
    )
    return stop
  }, [run.run_id, run.status])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const stats = finalStats || {}
  const levelColor = (l) => l === 'ERROR' ? 'var(--red)' : l === 'WARNING' ? 'var(--amber)' : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{run.run_id}</span>
            <StatusBadge status={status} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            {run.platform} · {run.start_month}{run.end_month !== run.start_month ? ` → ${run.end_month}` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label="MECA" value={stats.meca_files_processed} />
        <Stat label="Parsed" value={stats.documents_parsed} />
        <Stat label="Dedup removed" value={stats.duplicates_removed} />
        <Stat label="Inserted" value={stats.documents_inserted} />
        <Stat label="Upserted" value={stats.documents_upserted} />
        <Stat label="Errors" value={stats.errors} color={stats.errors > 0 ? 'var(--red)' : 'var(--green)'} />
        {stats.duration_seconds != null && (
          <Stat label="Duration" value={`${stats.duration_seconds.toFixed(2)}s`} />
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Live log
      </div>
      <div
        ref={logRef}
        style={{
          background: '#0d0d0d', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '10px 12px', height: 200, overflowY: 'auto',
          fontFamily: 'var(--font-mono)', fontSize: 12,
        }}
      >
        {logs.length === 0 && status === 'running' && (
          <span style={{ color: 'var(--text-muted)' }}>Waiting for logs…</span>
        )}
        {logs.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '1px 0' }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{l.time}</span>
            <span style={{ color: levelColor(l.level), flexShrink: 0, minWidth: 44 }}>{l.level}</span>
            <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{l.message}</span>
          </div>
        ))}
        {status !== 'running' && logs.length > 0 && (
          <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>— end of log —</div>
        )}
      </div>
    </div>
  )
}
