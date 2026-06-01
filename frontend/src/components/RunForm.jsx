import React, { useState } from 'react'
import { Play, Loader } from 'lucide-react'
import { createRun } from '../api'

const DEFAULT = {
  platform: 'biorxiv',
  start_month: '',
  end_month: '',
  resume: true,
  local_only: false,
  cleanup: false,
  clear_checkpoint: false,
  download_workers: 1,
}

export default function RunForm({ onRunStarted }) {
  const [form, setForm] = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.start_month) { setError('Start month is required'); return }
    setLoading(true)
    try {
      const run = await createRun({
        ...form,
        end_month: form.end_month || null,
        download_workers: Number(form.download_workers),
      })
      onRunStarted(run)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const label = { fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }
  const field = { display: 'flex', flexDirection: 'column' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 12 }}>
        <div style={field}>
          <span style={label}>Platform</span>
          <select value={form.platform} onChange={e => set('platform', e.target.value)}>
            <option value="biorxiv">bioRxiv</option>
            <option value="medrxiv">medRxiv</option>
          </select>
        </div>
        <div style={field}>
          <span style={label}>Start month</span>
          <input
            type="text" placeholder="01-2024"
            value={form.start_month}
            onChange={e => set('start_month', e.target.value)}
          />
        </div>
        <div style={field}>
          <span style={label}>End month <span style={{ color: 'var(--text-muted)' }}>(optional)</span></span>
          <input
            type="text" placeholder="12-2024"
            value={form.end_month}
            onChange={e => set('end_month', e.target.value)}
          />
        </div>
        <div style={field}>
          <span style={label}>Workers</span>
          <input
            type="number" min={1} max={20}
            value={form.download_workers}
            onChange={e => set('download_workers', e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {[
          ['resume', 'Resume checkpoint'],
          ['local_only', 'Local only'],
          ['cleanup', 'Cleanup after'],
          ['clear_checkpoint', 'Clear checkpoint'],
        ].map(([key, lbl]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />
            {lbl}
          </label>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: loading ? 'var(--border)' : 'var(--accent)',
              color: '#0a0a0a', border: 'none',
              borderRadius: 'var(--radius)', padding: '8px 18px',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {loading ? 'Starting…' : 'Run pipeline'}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </button>
        </div>
      </div>
    </form>
  )
}
