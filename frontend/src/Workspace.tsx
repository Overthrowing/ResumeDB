import { useCallback, useEffect, useState } from 'react'
import { api, type Application, type AppStatus, type AuditResult, type HistoryEntry, type RenderResult } from './api'
import ChatRail from './ChatRail'
import MarkdownField from './MarkdownField'
import { IconCheck, IconChevronLeft, IconDownload, IconRefresh, IconSparkle, IconWarn } from './icons'

const PIPELINE_STEPS: { status: AppStatus; label: string; color: string }[] = [
  { status: 'not_started', label: 'Not Started', color: 'var(--color-neutral-400)' },
  { status: 'in_progress', label: 'In Progress', color: '#42a5f5' },
  { status: 'awaiting_review', label: 'Awaiting Review', color: '#ffa726' },
  { status: 'ready', label: 'Ready', color: '#66bb6a' },
  { status: 'applied', label: 'Applied', color: 'var(--color-accent)' },
]

type Tab = 'overview' | 'resume' | 'cover' | 'ats' | 'versions' | 'autofill'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'resume', label: 'Resume' },
  { id: 'cover', label: 'Cover & Q&A' },
  { id: 'ats', label: 'ATS check' },
  { id: 'versions', label: 'Versions' },
  { id: 'autofill', label: 'Autofill' },
]

export default function Workspace({ id, onClose }: { id: string; onClose: () => void }) {
  const [app, setApp] = useState<Application | null>(null)
  const [tab, setTab] = useState<Tab>('resume')
  const [error, setError] = useState('')
  const [renderCount, setRenderCount] = useState(0)
  const [lastRender, setLastRender] = useState<RenderResult | null>(null)

  const reload = useCallback(() => api.application(id).then(setApp).catch((e) => setError(e.message)), [id])
  useEffect(() => {
    reload()
  }, [reload])

  const render = async () => {
    try {
      const r = await api.render(id)
      setLastRender(r)
      if (r.ok) setRenderCount((n) => n + 1)
      else setError(r.stderr)
      reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!app) return <div style={{ padding: 'var(--space-6)' }} className="text-muted">{error || 'Loading…'}</div>

  const meta = app.meta

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}>
          <IconChevronLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>
            {meta.role} · {meta.company}
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            {meta.deadline ? `Deadline ${meta.deadline} · ` : ''}reads your Library + memory, writes this
            application's outputs
          </div>
        </div>
        <span className="tag tag-accent" style={{ textTransform: 'capitalize' }}>{meta.status}</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', gap: 2, padding: '0 var(--space-4)', borderBottom: '1px solid var(--color-divider)', overflowX: 'auto' }}>
            {TABS.map((t) => (
              <div key={t.id} className={`ws-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </div>
            ))}
          </div>
          <div className="rs-scroll" style={{ flex: 1, minHeight: 0, padding: 'var(--space-6)' }}>
            {error && (
              <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)', whiteSpace: 'pre-wrap' }}>
                {error}
                <button className="btn btn-ghost" style={{ fontSize: 12, marginLeft: 8 }} onClick={() => setError('')}>
                  dismiss
                </button>
              </div>
            )}
            {tab === 'overview' && <Overview app={app} onError={setError} onSaved={reload} />}
            {tab === 'resume' && (
              <ResumeTab app={app} renderCount={renderCount} lastRender={lastRender} onRender={render} onError={setError} onSaved={reload} />
            )}
            {tab === 'cover' && <CoverTab app={app} onError={setError} onSaved={reload} />}
            {tab === 'ats' && <AtsTab appId={id} />}
            {tab === 'versions' && <VersionsTab appId={id} onReverted={reload} onError={setError} />}
            {tab === 'autofill' && <AutofillTab app={app} />}
          </div>
        </div>

        <ChatRail
          scope={`app:${id}`}
          title="Tailoring assistant"
          subtitle="Library + memory + this job"
          placeholder="Ask to reshape the resume, draft the cover letter…"
          context={`Context: your Library · memory doc · this job's instructions`}
          onRendered={(pages, ok) => {
            setLastRender({ ok, pages, overflow: pages > 1, stderr: '' })
            if (ok) setRenderCount((n) => n + 1)
          }}
          onTurnDone={reload}
        />
      </div>
    </div>
  )
}

function Overview({ app, onError, onSaved }: { app: Application; onError: (e: string) => void; onSaved: () => void }) {
  const meta = app.meta
  const [fields, setFields] = useState({
    company: meta.company,
    role: meta.role,
    source: meta.source ?? '',
    deadline: meta.deadline ?? '',
    status: meta.status,
  })
  const [jd, setJd] = useState(app.files['jd.md'] ?? '')
  const [notes, setNotes] = useState(app.files['notes.md'] ?? '')
  const [decisions, setDecisions] = useState(app.files['decisions.md'] ?? '')
  const [dirty, setDirty] = useState(false)

  const save = async () => {
    try {
      await api.saveAppMeta(meta.id, fields)
      if (jd !== (app.files['jd.md'] ?? '')) await api.saveAppFile(meta.id, 'jd.md', jd)
      if (notes !== (app.files['notes.md'] ?? '')) await api.saveAppFile(meta.id, 'notes.md', notes)
      if (decisions !== (app.files['decisions.md'] ?? ''))
        await api.saveAppFile(meta.id, 'decisions.md', decisions)
      setDirty(false)
      onSaved()
    } catch (e) {
      onError((e as Error).message)
    }
  }
  const set = (patch: Partial<typeof fields>) => {
    setFields({ ...fields, ...patch })
    setDirty(true)
  }

  const currentIdx = PIPELINE_STEPS.findIndex((s) => s.status === fields.status)

  const transitionStatus = async (newStatus: AppStatus) => {
    try {
      await api.saveAppMeta(meta.id, { status: newStatus })
      setFields({ ...fields, status: newStatus })
      onSaved()
    } catch (e) {
      onError((e as Error).message)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Status progression bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 'var(--space-6)', padding: 'var(--space-3) 0' }}>
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = step.status === fields.status
          const isPast = i < currentIdx
          const dotColor = isActive || isPast ? step.color : 'var(--color-neutral-300)'
          return (
            <div key={step.status} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: isActive ? 20 : 12,
                    height: isActive ? 20 : 12,
                    borderRadius: '50%',
                    background: dotColor,
                    border: isActive ? `3px solid color-mix(in srgb, ${step.color} 30%, transparent)` : 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <span style={{ fontSize: 10, color: isActive ? step.color : 'var(--color-neutral-500)', fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: isPast ? PIPELINE_STEPS[i + 1].color : 'var(--color-neutral-300)', margin: '0 6px', marginBottom: 18 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Status action buttons */}
      {fields.status === 'awaiting_review' && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', border: '1px solid #66bb6a', borderRadius: 'var(--radius-md)', background: '#e8f5e920' }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ color: '#2e7d32' }}>Ready to lock in?</strong>
            <div className="text-muted" style={{ fontSize: 12 }}>Review everything above, then finalize.</div>
          </div>
          <button className="btn" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 16px', fontSize: 13 }} onClick={() => transitionStatus('ready')}>
            Lock In
          </button>
        </div>
      )}
      {fields.status === 'ready' && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-100)' }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ color: 'var(--color-accent-800)' }}>Application is locked and ready.</strong>
            <div className="text-muted" style={{ fontSize: 12 }}>Once you submit it, mark it as applied.</div>
          </div>
          <button className="btn" style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', padding: '6px 16px', fontSize: 13 }} onClick={() => transitionStatus('applied')}>
            Mark as Applied
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Company</label>
          <input className="input" value={fields.company} onChange={(e) => set({ company: e.target.value })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Role</label>
          <input className="input" value={fields.role} onChange={(e) => set({ role: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Source link</label>
          <input className="input" value={fields.source} onChange={(e) => set({ source: e.target.value })} />
        </div>
        <div className="field" style={{ width: 130 }}>
          <label>Deadline</label>
          <input className="input" value={fields.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </div>
        <div className="field" style={{ width: 150 }}>
          <label>Status</label>
          <select className="input" value={fields.status} onChange={(e) => set({ status: e.target.value as AppStatus })}>
            {PIPELINE_STEPS.map((s) => (
              <option key={s.status} value={s.status}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
        <label>Job description</label>
        <MarkdownField
          value={jd}
          minHeight={150}
          placeholder="Paste the posting, or create the application from a link."
          onChange={(v) => {
            setJd(v)
            setDirty(true)
          }}
        />
      </div>
      <div style={{ border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-neutral-100)', marginBottom: 'var(--space-4)' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--color-accent-800)', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <IconSparkle size={15} />
          What to optimize for{' '}
          <span className="text-muted" style={{ fontWeight: 400, fontSize: 11 }}>
            - job-specific, lives & dies with this application
          </span>
        </div>
        <MarkdownField
          value={notes}
          minHeight={70}
          style={{ background: 'transparent' }}
          placeholder="Lead with X, downplay Y, mirror their language…"
          onChange={(v) => {
            setNotes(v)
            setDirty(true)
          }}
        />
      </div>
      {decisions && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--color-accent-800)', marginBottom: 8 }}>
            Tailoring decisions
            <span className="text-muted" style={{ fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
              - written by the agent each run, one bullet per choice with its JD evidence
            </span>
          </div>
          <MarkdownField
            value={decisions}
            minHeight={120}
            onChange={(v) => {
              setDecisions(v)
              setDirty(true)
            }}
          />
        </div>
      )}
      <button className="btn btn-primary" disabled={!dirty} onClick={save}>
        Save overview
      </button>
    </div>
  )
}

function ResumeTab({
  app,
  renderCount,
  lastRender,
  onRender,
  onError,
  onSaved,
}: {
  app: Application
  renderCount: number
  lastRender: RenderResult | null
  onRender: () => Promise<void>
  onError: (e: string) => void
  onSaved: () => void
}) {
  const [view, setView] = useState<'preview' | 'source'>('preview')
  const [source, setSource] = useState(app.files['resume.yaml'] ?? '')
  const [dirty, setDirty] = useState(false)

  const saveSource = async () => {
    try {
      await api.saveAppFile(app.meta.id, 'resume.yaml', source)
      setDirty(false)
      onSaved()
      await onRender()
      setView('preview')
    } catch (e) {
      onError((e as Error).message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="tag tag-neutral">resume.pdf · Typst</span>
          {lastRender?.ok && (
            <span className={`tag ${lastRender.overflow ? 'tag-outline' : 'tag-accent'}`}>
              {lastRender.pages} page{lastRender.pages === 1 ? '' : 's'}
              {lastRender.overflow ? ' - overflows!' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {(['preview', 'source'] as const).map((v) => (
              <span
                key={v}
                onClick={() => setView(v)}
                style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: view === v ? 'var(--color-accent)' : undefined, boxShadow: view === v ? 'inset 0 0 0 1px var(--color-accent)' : undefined }}
              >
                {v === 'preview' ? 'Preview' : 'resume.yaml'}
              </span>
            ))}
          </div>
          {view === 'source' ? (
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} disabled={!dirty} onClick={saveSource}>
              Save & render
            </button>
          ) : (
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onRender}>
              <IconRefresh size={14} />
              Render
            </button>
          )}
          <a className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} href={`/api/applications/${app.meta.id}/resume.pdf`} download={`resume-${app.meta.company.toLowerCase()}.pdf`}>
            <IconDownload size={14} />
            Export
          </a>
        </div>
      </div>

      {view === 'preview' ? (
        app.has_pdf || renderCount > 0 ? (
          <iframe
            key={renderCount}
            title="resume preview"
            src={`/api/applications/${app.meta.id}/resume.pdf#toolbar=0&t=${renderCount}`}
            style={{ flex: 1, minHeight: 0, width: '100%', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', background: '#fff' }}
          />
        ) : (
          <div className="text-muted" style={{ fontSize: 14, textAlign: 'center', marginTop: 'var(--space-8)' }}>
            Not rendered yet - hit Render, or ask the tailoring assistant to draft it.
          </div>
        )
      ) : (
        <textarea
          className="input"
          spellCheck={false}
          style={{ flex: 1, minHeight: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, lineHeight: 1.5 }}
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setDirty(true)
          }}
        />
      )}
    </div>
  )
}

function CoverTab({ app, onError, onSaved }: { app: Application; onError: (e: string) => void; onSaved: () => void }) {
  const [text, setText] = useState(app.files['cover-letter.md'] ?? '')
  const [dirty, setDirty] = useState(false)
  const save = async () => {
    try {
      await api.saveAppFile(app.meta.id, 'cover-letter.md', text)
      setDirty(false)
      onSaved()
    } catch (e) {
      onError((e as Error).message)
    }
  }
  return (
    <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h4 style={{ margin: 0 }}>Cover letter</h4>
        <button className="btn btn-secondary" style={{ fontSize: 13 }} disabled={!dirty} onClick={save}>
          Save
        </button>
      </div>
      <MarkdownField
        value={text}
        minHeight={320}
        placeholder="Ask the tailoring assistant for a draft, or write your own."
        onChange={(v) => {
          setText(v)
          setDirty(true)
        }}
      />
      <p className="text-muted" style={{ fontSize: 12 }}>
        Short answers live here too - ask the assistant to append Q&A blocks.
      </p>
    </div>
  )
}

function AtsTab({ appId }: { appId: string }) {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      setResult(await api.audit(appId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const ext = result?.extraction
  const llm = result?.llm
  const extScore = ext && ext.checked > 0 ? Math.round(((ext.checked - ext.missing.length) / ext.checked) * 100) : null

  return (
    <div style={{ maxWidth: 660 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <p className="text-muted" style={{ fontSize: 13, margin: 0, maxWidth: '46ch' }}>
          Proves machines can read every word of the PDF, then scores keyword coverage against the job
          description.
        </p>
        <button className="btn btn-primary" disabled={busy} onClick={run}>
          {busy ? 'Auditing…' : 'Run audit'}
        </button>
      </div>
      {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{error}</div>}
      {ext?.error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{ext.error}</div>}

      {result && !ext?.error && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ flex: 1, border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 44, lineHeight: 1, color: 'var(--color-accent-700)', fontFeatureSettings: "'tnum'" }}>
                {extScore ?? '-'}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Parse-health score
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-accent-700)', marginTop: 2 }}>
                {ext?.ok ? 'Machine-readable, every field extracted' : `${ext?.missing.length} field(s) lost in extraction`}
              </div>
            </div>
            <div style={{ flex: 1, border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 44, lineHeight: 1, fontFeatureSettings: "'tnum'" }}>
                {llm?.score != null ? Math.round(llm.score) : '-'}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Keyword coverage vs JD
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-accent-700)', marginTop: 2 }}>
                {llm?.error ? 'rubric unavailable' : `${llm?.covered?.length ?? 0} covered · ${llm?.missing?.length ?? 0} missing`}
              </div>
            </div>
          </div>

          {ext && ext.missing.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 8 }}>Text lost in machine extraction</div>
              <div style={{ border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
                {ext.missing.map((m, i) => (
                  <div key={i} style={{ display: 'flex', padding: '9px 14px', fontSize: 13, borderBottom: i < ext.missing.length - 1 ? '1px solid var(--color-divider)' : 'none', alignItems: 'center', background: 'var(--color-accent-100)', gap: 10 }}>
                    <span style={{ color: 'var(--color-accent-700)', flex: 'none' }}>
                      <IconWarn size={14} />
                    </span>
                    <div style={{ width: 160, color: 'var(--color-neutral-600)', flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.field}</div>
                    <div style={{ flex: 1 }}>
                      {m.text}{' '}
                      <span style={{ color: 'var(--color-accent-800)', fontSize: 11 }}>· lost: {m.missing_tokens.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {llm && !llm.error && (
            <>
              {(llm.missing?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 8 }}>Missing keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {llm.missing!.map((k) => (
                      <span key={k} className="tag tag-outline">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(llm.covered?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 8 }}>Covered</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {llm.covered!.map((k) => (
                      <span key={k} className="tag tag-neutral" style={{ display: 'inline-flex', gap: 5 }}>
                        <IconCheck size={11} />
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {llm.notes && (
                <div style={{ border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-neutral-100)' }}>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-heading)', color: 'var(--color-accent-800)', marginBottom: 6 }}>Assessment</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{llm.notes}</div>
                </div>
              )}
            </>
          )}
          {llm?.error && <div className="text-muted" style={{ fontSize: 13 }}>Keyword rubric failed: {llm.error}</div>}
        </>
      )}
      {!result && !busy && (
        <div className="text-muted" style={{ fontSize: 14 }}>
          Render the resume first, then run the audit.
        </div>
      )}
    </div>
  )
}

function VersionsTab({ appId, onReverted, onError }: { appId: string; onReverted: () => void; onError: (e: string) => void }) {
  const [log, setLog] = useState<HistoryEntry[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [diff, setDiff] = useState('')

  const reload = useCallback(
    () => api.history(`app:${appId}`).then(setLog).catch((e) => onError(e.message)),
    [appId, onError],
  )
  useEffect(() => {
    reload()
  }, [reload])

  const toggle = async (sha: string) => {
    if (open === sha) {
      setOpen(null)
      return
    }
    setOpen(sha)
    setDiff('')
    try {
      setDiff(await api.historyDiff(sha))
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const revert = async (sha: string) => {
    if (!confirm('Undo this change? A new checkpoint reverting it will be created.')) return
    try {
      await api.revert(sha)
      reload()
      onReverted()
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div style={{ maxWidth: 720 }}>
      {log.map((h, i) => (
        <div key={h.sha} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                marginTop: 5,
                background: i === 0 ? 'var(--color-accent)' : 'var(--color-bg)',
                border: i === 0 ? 'none' : '1.5px solid var(--color-neutral-400)',
              }}
            />
            {i < log.length - 1 && <div style={{ flex: 1, width: 1, background: 'var(--color-divider)' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 'var(--space-4)', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }} onClick={() => toggle(h.sha)}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>
                {h.subject.replace(/^app:[^:]*: /, '')}
              </span>
              {i === 0 && <span className="tag tag-accent">Current</span>}
              <span className="text-muted" style={{ fontSize: 12, marginLeft: 'auto', flex: 'none' }}>
                {fmt(h.timestamp)}
              </span>
            </div>
            {open === h.sha && (
              <div style={{ marginTop: 8 }}>
                <pre
                  style={{ fontSize: 11.5, lineHeight: 1.45, background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}
                >
                  {diff || 'Loading…'}
                </pre>
                <button className="btn btn-secondary" style={{ padding: '5px 11px', fontSize: 13 }} onClick={() => revert(h.sha)}>
                  Undo this change
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {log.length === 0 && <div className="text-muted">No history yet.</div>}
    </div>
  )
}

function AutofillTab({ app }: { app: Application }) {
  const [profile, setProfile] = useState<any>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    api.profile().then(setProfile).catch(() => {})
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDownload = () => {
    window.open(`/api/applications/${app.meta.id}/resume.pdf`, '_blank')
  }

  if (!profile) return <div className="text-muted">Loading profile...</div>

  const fields = [
    { label: 'Full Name', value: profile.name || '' },
    { label: 'Email Address', value: profile.email || '' },
    { label: 'Phone Number', value: profile.phone || '' },
    { label: 'Location (City/State)', value: profile.location || '' },
  ]

  if (profile.links) {
    profile.links.forEach((l: any) => {
      fields.push({ label: l.label, value: l.url })
    })
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Auto-fill Application Form</h3>
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
          Use the ResumeDB Chrome Extension to automatically fill this application's forms and upload the tailored resume PDF in one click.
        </p>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', borderLeft: '3px solid var(--color-accent)' }}>
        <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 15 }}>How to use the Chrome Extension:</h4>
        <ol style={{ fontSize: 13, margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>
            Open Chrome and navigate to <strong>chrome://extensions</strong>.
          </li>
          <li>
            Enable <strong>Developer mode</strong> (toggle switch in the top-right corner).
          </li>
          <li>
            Click <strong>Load unpacked</strong> (top-left button) and select the extension folder:
            <code style={{ display: 'block', background: 'var(--color-neutral-100)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', marginTop: 4, fontFamily: 'monospace', fontSize: 12 }}>
              /Users/nathanye/Dev/Hackathons/ResumeDB/extension
            </code>
          </li>
          <li>
            Open the job application page (Lever, Greenhouse, etc.), open the extension from your browser toolbar, select <strong>{app.meta.company} - {app.meta.role}</strong>, and click <strong>Auto-fill current form</strong>.
          </li>
        </ol>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Manual Copy-Paste Details</h3>
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
          Quick one-click copying for manual form entry.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <strong style={{ fontSize: 13 }}>Tailored Resume (PDF)</strong>
            <div className="text-muted" style={{ fontSize: 12 }}>Download the PDF tailored specifically for this role</div>
          </div>
          <button className="btn btn-primary" onClick={handleDownload} style={{ padding: '4px 10px', fontSize: 12 }}>
            Download PDF
          </button>
        </div>

        {fields.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <strong style={{ fontSize: 13 }}>{f.label}</strong>
              <div style={{ fontSize: 13, marginTop: 2, fontFamily: 'monospace', color: 'var(--color-accent-900)' }}>
                {f.value || <span className="text-muted" style={{ fontStyle: 'italic' }}>Not specified</span>}
              </div>
            </div>
            {f.value && (
              <button
                className="btn btn-secondary"
                onClick={() => copyToClipboard(f.value, f.label)}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                {copiedField === f.label ? 'Copied ✓' : 'Copy'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

