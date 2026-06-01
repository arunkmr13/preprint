import React from 'react'
import { Trash2, ChevronRight } from 'lucide-react'
import { deleteRun } from '../api'
import StatusBadge from './StatusBadge'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function RunHistory({ runs, onSelect, onDeleted }) {
  const handleDelete = async (e, runId) => {
    e.stopPropagation()
    if (!confirm('Delete this run record?')) return
    await deleteRun(runId)
    onDeleted()
  }

  if (!runs.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '2rem',
        textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
      }}>
        No runs yet. Start one above.
      </div>
    )
  }

  const col = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }
  const cell = { padding: '10px 12px', fontSize: 13 }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Run ID', 'Platform', 'Range', 'Docs', 'Errors', 'Started', 'Duration', 'Status', ''].map((h, i) => (
              <th key={i} style={{ ...cell, ...col, textAlign: 'left', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => {
            const s = run.stats || {}
            return (
              <tr
                key={run.run_id}
                onClick={() => onSelect(run)}
                style={{
                  borderBottom: i < runs.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-panel)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {run.run_id.slice(0, 15)}…
                </td>
                <td style={cell}>{run.platform}</td>
                <td style={{ ...cell, color: 'var(--text-secondary)' }}>
                  {run.start_month}{run.end_month !== run.start_month ? ` → ${run.end_month}` : ''}
                </td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)' }}>{s.documents_inserted ?? '—'}</td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)', color: s.errors > 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
                  {s.errors ?? '—'}
                </td>
                <td style={{ ...cell, color: 'var(--text-secondary)' }}>{fmt(run.started_at)}</td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {run.duration_seconds != null ? `${run.duration_seconds.toFixed(1)}s` : '—'}
                </td>
                <td style={cell}><StatusBadge status={run.status} /></td>
                <td style={{ ...cell, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={e => handleDelete(e, run.run_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                    title="Delete run"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
