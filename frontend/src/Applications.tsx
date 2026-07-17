import { useCallback, useEffect, useState } from 'react'
import { api, type AppMeta, type AppStatus } from './api'
import ChatRail from './ChatRail'
import Workspace from './Workspace'
import { IconPlus } from './icons'

const STATUS_STYLE: Record<AppStatus, { bg: string; color: string; border: string }> = {
  not_started: { bg: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)', border: 'var(--color-neutral-400)' },
  in_progress: { bg: '#e3f2fd', color: '#1565c0', border: '#42a5f5' },
  awaiting_review: { bg: '#fff3e0', color: '#e65100', border: '#ffa726' },
  ready: { bg: '#e8f5e9', color: '#2e7d32', border: '#66bb6a' },
  applied: { bg: 'var(--color-accent-100)', color: 'var(--color-accent-800)', border: 'var(--color-accent)' },
}

const STATUS_LABELS: Record<AppStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  awaiting_review: 'Awaiting Review',
  ready: 'Ready',
  applied: 'Applied',
}

const ALL_STATUSES: AppStatus[] = ['not_started', 'in_progress', 'awaiting_review', 'ready', 'applied']

export default function Applications({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [apps, setApps] = useState<AppMeta[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')

  const reload = useCallback(
    () =>
      api
        .applications()
        .then((a) => {
          setApps(a)
          onCountChange(a.length)
        })
        .catch((e) => setError(e.message)),
    [onCountChange],
  )
  useEffect(() => {
    reload()
  }, [reload])

  if (openId) return <Workspace id={openId} onClose={() => (setOpenId(null), reload())} />

  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter)

  const statusCounts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div className="rs-scroll" style={{ flex: 1, minWidth: 0, padding: 'var(--space-6) var(--space-8)' }}>
      <div className="section-head">
        <div>
          <h2 style={{ margin: 0 }}>Applications</h2>
          <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            Each is a workbench: one job, tailored from your Library.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <IconPlus size={15} />
          New application
        </button>
      </div>

      {/* Status filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button
          className="btn"
          style={{
            padding: '4px 12px',
            fontSize: 12,
            borderRadius: 20,
            border: filter === 'all' ? '1.5px solid var(--color-accent)' : '1px solid var(--color-divider)',
            background: filter === 'all' ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
            color: filter === 'all' ? 'var(--color-accent)' : 'var(--color-neutral-600)',
          }}
          onClick={() => setFilter('all')}
        >
          All ({apps.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const style = STATUS_STYLE[s]
          const active = filter === s
          return (
            <button
              key={s}
              className="btn"
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 20,
                border: active ? `1.5px solid ${style.border}` : '1px solid var(--color-divider)',
                background: active ? style.bg : 'transparent',
                color: active ? style.color : 'var(--color-neutral-600)',
              }}
              onClick={() => setFilter(s)}
            >
              {STATUS_LABELS[s]} ({statusCounts[s] || 0})
            </button>
          )
        })}
      </div>

      {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Role</th>
            <th>Company</th>
            <th>Status</th>
            <th>Deadline</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => {
            const style = STATUS_STYLE[a.status] || STATUS_STYLE.not_started
            return (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(a.id)}>
                <td style={{ width: 4, padding: 0 }}>
                  <div style={{ width: 4, height: '100%', minHeight: 36, background: style.border, borderRadius: 2 }} />
                </td>
                <td style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{a.role}</td>
                <td>{a.company}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 11,
                      padding: '3px 10px',
                      borderRadius: 3,
                      background: style.bg,
                      color: style.color,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                </td>
                <td className="text-muted">{a.deadline || '-'}</td>
                <td style={{ textAlign: 'right', color: 'var(--color-neutral-500)' }}>{'→'}</td>
              </tr>
            )
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                {filter === 'all' ? 'No applications yet.' : `No ${STATUS_LABELS[filter as AppStatus].toLowerCase()} applications.`}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {creating && (
        <NewApplicationDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            reload()
            setOpenId(id)
          }}
        />
      )}
      </div>

      <ChatRail
        scope="apps"
        title="Applications assistant"
        subtitle="Creates & tracks applications"
        placeholder="Paste a job link to start an application, or ask about your pipeline..."
        onTurnDone={reload}
      />
    </div>
  )
}

function NewApplicationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [template, setTemplate] = useState('classic')
  const [templates, setTemplates] = useState<string[]>(['classic'])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.templates().then(setTemplates).catch(() => {})
  }, [])

  const create = async () => {
    if (!company.trim() || !role.trim()) {
      setError('Company and role are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await api.createApplication({
        company: company.trim(),
        role: role.trim(),
        jd_text: jdText,
        jd_url: jdUrl.trim() || undefined,
        template,
      })
      onCreated(res.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ width: 'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">New application</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="field">
            <label>Company</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="field">
            <label>Role</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Job description - paste it, or give a link below</label>
          <textarea className="input" style={{ minHeight: 110 }} value={jdText} onChange={(e) => setJdText(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 'var(--space-3)' }}>
          <div className="field">
            <label>Posting link (agent fetches it)</label>
            <input className="input" placeholder="https://..." value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} />
          </div>
          <div className="field">
            <label>Template</label>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>
              {templates.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13 }}>{error}</div>}
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={create}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
