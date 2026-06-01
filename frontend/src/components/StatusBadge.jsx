import React from 'react'

const CONFIG = {
  running:     { color: 'var(--amber)',  bg: 'var(--amber-dim)',  label: 'Running' },
  completed:   { color: 'var(--green)',  bg: 'var(--green-dim)',  label: 'Done' },
  failed:      { color: 'var(--red)',    bg: 'var(--red-dim)',    label: 'Failed' },
  interrupted: { color: 'var(--blue)',   bg: 'var(--blue-dim)',   label: 'Interrupted' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.failed
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.03em',
      padding: '2px 8px', borderRadius: 99,
      color: cfg.color, background: cfg.bg,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.color,
        animation: status === 'running' ? 'pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {cfg.label}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </span>
  )
}
