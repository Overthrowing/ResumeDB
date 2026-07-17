import { useCallback, useEffect, useState } from 'react'
import { api, type AppMeta } from './api'
import ChatRail from './ChatRail'
import Workspace from './Workspace'
import { IconPlus } from './icons'

const STATUS_TAG: Record<string, string> = {
  draft: 'tag-neutral',
  tailoring: 'tag-accent',
  submitted: 'tag-neutral',
}

export default function Applications({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [apps, setApps] = useState<AppMeta[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

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
      {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Company</th>
            <th>Status</th>
            <th>Deadline</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(a.id)}>
              <td style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{a.role}</td>
              <td>{a.company}</td>
              <td>
                <span className={`tag ${STATUS_TAG[a.status] ?? 'tag-neutral'}`} style={{ textTransform: 'capitalize' }}>{a.status}</span>
              </td>
              <td className="text-muted">{a.deadline || '-'}</td>
              <td style={{ textAlign: 'right', color: 'var(--color-neutral-500)' }}>→</td>
            </tr>
          ))}
          {apps.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                No applications yet.
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
        placeholder="Paste a job link to start an application, or ask about your pipeline…"
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
            <input className="input" placeholder="https://…" value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} />
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
