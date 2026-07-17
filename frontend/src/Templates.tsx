import { useEffect, useState } from 'react'
import { api } from './api'

export default function Templates() {
  const [templates, setTemplates] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.templates().then(setTemplates).catch((e) => setError(e.message))
  }, [])

  return (
    <div className="rs-scroll" style={{ flex: 1, padding: 'var(--space-6) var(--space-8)' }}>
      <div className="section-head">
        <div>
          <h2 style={{ margin: 0 }}>Templates</h2>
          <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            Typst templates in your data repo. Ask any assistant chat for a new one - agents author and
            compile-check them.
          </p>
        </div>
      </div>
      {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', maxWidth: 820 }}>
        {templates.map((t, i) => (
          <div key={t} className="card">
            <div className="card-kicker">Typst{i === 0 ? ' · default' : ''}</div>
            <div className="card-title">{t}</div>
            <p className="card-body">templates/{t}.typ - single column, ATS-safe per the schema contract.</p>
          </div>
        ))}
      </div>
    </div>
  )
}
