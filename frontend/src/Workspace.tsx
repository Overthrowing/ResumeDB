import { useCallback, useEffect, useState } from 'react'
import { api, type Application, type AppStatus, type AuditResult, type AutofillPackage, type HistoryEntry, type ReadinessReport, type RenderResult, type TailoringReport } from './api'
import ChatRail from './ChatRail'
import MarkdownField from './MarkdownField'
import { IconCheck, IconChevronLeft, IconDownload, IconRefresh, IconSparkle, IconWarn } from './icons'
import { apiUrl } from './runtime'
import { isDemoApplication } from './demoMode'

const PIPELINE_STEPS: { status: AppStatus; label: string; color: string }[] = [
  { status: 'not_started', label: 'Not Started', color: 'var(--color-neutral-400)' },
  { status: 'in_progress', label: 'In Progress', color: '#42a5f5' },
  { status: 'draft', label: 'Draft', color: '#ffa726' },
  { status: 'ready', label: 'Ready', color: '#66bb6a' },
  { status: 'submitted', label: 'Submitted', color: 'var(--color-accent)' },
]

type Tab = 'overview' | 'comparison' | 'resume' | 'cover' | 'ats' | 'versions' | 'autofill'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'comparison', label: 'Tailoring' },
  { id: 'resume', label: 'Resume' },
  { id: 'cover', label: 'Cover & Q&A' },
  { id: 'ats', label: 'ATS check' },
  { id: 'versions', label: 'Versions' },
  { id: 'autofill', label: 'Autofill' },
]

export default function Workspace({
  id,
  onClose,
  focusTab,
}: {
  id: string
  onClose: () => void
  focusTab?: 'comparison' | 'autofill'
}) {
  const [app, setApp] = useState<Application | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [error, setError] = useState('')
  const [renderCount, setRenderCount] = useState(0)
  const [lastRender, setLastRender] = useState<RenderResult | null>(null)

  const reload = useCallback(() => api.application(id).then(setApp).catch((e) => setError(e.message)), [id])
  useEffect(() => {
    reload()
  }, [reload])
  useEffect(() => {
    if (focusTab) setTab(focusTab)
  }, [focusTab])

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
  const demo = isDemoApplication(meta)

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className={demo ? 'workspace-demo-header' : undefined} style={{ padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}>
          <IconChevronLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="demo-record-title" style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>
            <span>{meta.role} · {meta.company}</span>
            {demo && <span className="demo-badge">Synthetic demo</span>}
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
            {tab === 'comparison' && <TailoringTab appId={id} />}
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
    outcome: meta.outcome ?? '',
  })
  const [jd, setJd] = useState(app.files['jd.md'] ?? '')
  const [notes, setNotes] = useState(app.files['notes.md'] ?? '')
  const [decisions, setDecisions] = useState(app.files['decisions.md'] ?? '')
  const [dirty, setDirty] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

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
    setActionBusy(true)
    try {
      if (newStatus === 'ready') await api.approve(meta.id)
      else if (newStatus === 'submitted') await api.markSubmitted(meta.id)
      else await api.saveAppMeta(meta.id, { status: newStatus })
      setFields({ ...fields, status: newStatus })
      onSaved()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setActionBusy(false)
    }
  }

  const prepare = async () => {
    setActionBusy(true)
    try {
      setFields({ ...fields, status: 'in_progress' })
      await api.prepare(meta.id)
      setFields({ ...fields, status: 'draft' })
      onSaved()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setActionBusy(false)
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
      {(fields.status === 'not_started' || fields.status === 'in_progress') && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', border: '1px solid #42a5f5', borderRadius: 'var(--radius-md)', background: '#e3f2fd55' }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ color: '#155a91' }}>Let the agent prepare the complete package.</strong>
            <div className="text-muted" style={{ fontSize: 12 }}>It will tailor the resume, fill known answers, and flag facts only you can provide.</div>
          </div>
          <button className="btn" disabled={actionBusy} style={{ background: '#155a91', color: '#fff', border: 'none', padding: '6px 16px', fontSize: 13 }} onClick={prepare}>
            {actionBusy ? 'Preparing...' : 'Prepare draft'}
          </button>
        </div>
      )}
      {fields.status === 'draft' && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', border: '1px solid #66bb6a', borderRadius: 'var(--radius-md)', background: '#e8f5e920' }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ color: '#2e7d32' }}>Human review required.</strong>
            <div className="text-muted" style={{ fontSize: 12 }}>Review the resume, answers, missing facts, and tailoring evidence before approval.</div>
          </div>
          <button className="btn" disabled={actionBusy} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 16px', fontSize: 13 }} onClick={() => transitionStatus('ready')}>
            Approve as ready
          </button>
        </div>
      )}
      {fields.status === 'ready' && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-100)' }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ color: 'var(--color-accent-800)' }}>Application is locked and ready.</strong>
            <div className="text-muted" style={{ fontSize: 12 }}>Use the extension to autofill, then confirm after you click Submit.</div>
          </div>
          <button className="btn" disabled={actionBusy} style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', padding: '6px 16px', fontSize: 13 }} onClick={() => transitionStatus('submitted')}>
            Mark submitted
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
        <div className="field" style={{ width: 135 }}>
          <label>Status</label>
          <select className="input" value={fields.status} disabled aria-label="Application status">
            {PIPELINE_STEPS.map((s) => (
              <option key={s.status} value={s.status}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ width: 135 }}>
          <label>Outcome</label>
          <select className="input" value={fields.outcome} onChange={(e) => set({ outcome: e.target.value })}>
            <option value="">No outcome</option>
            <option value="interview">Interview</option>
            <option value="rejected">Rejected</option>
            <option value="offer">Offer</option>
            <option value="withdrawn">Withdrawn</option>
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

      {(fields.status === 'not_started' || fields.status === 'in_progress' || fields.status === 'draft') && (
        <ReviewPanel appId={meta.id} />
      )}
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
          <a className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} href={apiUrl(`/api/applications/${app.meta.id}/resume.pdf`)} download={`resume-${app.meta.company.toLowerCase()}.pdf`}>
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
            src={`${apiUrl(`/api/applications/${app.meta.id}/resume.pdf`)}#toolbar=0&t=${renderCount}`}
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
  const [packageData, setPackageData] = useState<AutofillPackage | null>(null)
  useEffect(() => {
    api.autofillPackage(app.meta.id).then(setPackageData).catch(() => {})
  }, [app.meta.id])
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
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div>
        <h4 style={{ margin: '0 0 4px' }}>Application answers</h4>
        <p className="text-muted" style={{ fontSize: 12 }}>Every answer includes its profile provenance. Missing facts stay blank.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {packageData?.answers.map((answer) => (
            <div key={`${answer.key}-${answer.question}`} className="dashboard-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13 }}>
                <strong>{answer.question}</strong>
                <div className="text-muted" style={{ fontSize: 10 }}>Source: {answer.source}</div>
              </div>
              <span style={{ fontSize: 13, maxWidth: '45%', textAlign: 'right' }}>{String(answer.value)}</span>
            </div>
          ))}
          {packageData?.missing.map((item) => (
            <div key={item.key} className="dashboard-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13 }}><strong>{item.label}</strong><div className="text-muted" style={{ fontSize: 10 }}>{item.message}</div></div>
              <span className="tag tag-outline">Missing{item.required ? ' · required' : ''}</span>
            </div>
          ))}
          {packageData && packageData.answers.length === 0 && packageData.missing.length === 0 && (
            <div className="empty-state">No application questions were included in this draft.</div>
          )}
        </div>
      </div>
      <hr className="hr" />
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

function TailoringTab({ appId }: { appId: string }) {
  const [report, setReport] = useState<TailoringReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setReport(null)
    setError('')
    api.tailoring(appId).then(setReport).catch((e) => setError(e.message))
  }, [appId])

  return (
    <section className="tailoring-comparison">
      <div className="tailoring-head" data-tour="tailoring-comparison">
        <div>
          <div className="card-kicker">Evidence-backed tailoring</div>
          <h3>What changed, and why</h3>
          <p className="text-muted">
            Every stronger phrase must trace back to a fact in the student&apos;s knowledge base.
          </p>
        </div>
        {report && (
          <div className="tailoring-count">
            <strong>{report.comparisons.length}</strong>
            <span>{report.generated ? 'agent rewrites' : 'verified changes'}</span>
          </div>
        )}
      </div>

      {error && <div className="error-banner">Could not load tailoring evidence: {error}</div>}
      {!report && !error && <div className="empty-state">Loading tailoring evidence...</div>}
      {report && report.comparisons.length === 0 && (
        <div className="empty-state">
          Prepare this application to generate a before-and-after explanation for each material rewrite.
        </div>
      )}

      <div className="tailoring-list">
        {report?.comparisons.map((comparison, index) => (
          <article className="tailoring-card" key={`${comparison.source}-${index}`}>
            <div className="tailoring-requirement">
              <span>Job requirement</span>
              <strong>{comparison.requirement}</strong>
              {!!comparison.keywords?.length && (
                <div className="tailoring-keywords">
                  {comparison.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                </div>
              )}
            </div>
            <div className="tailoring-split">
              <div className="tailoring-version tailoring-before">
                <span className="tailoring-label"><b>-</b> Before</span>
                <p>{comparison.before}</p>
              </div>
              <div className="tailoring-arrow" aria-hidden="true">→</div>
              <div className="tailoring-version tailoring-after">
                <span className="tailoring-label"><b>+</b> Tailored</span>
                <p>{comparison.after}</p>
              </div>
            </div>
            <div className="tailoring-evidence">
              <IconCheck size={14} />
              <div>
                <strong>Supported by {comparison.source}</strong>
                <span>{comparison.evidence}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
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
  const [data, setData] = useState<AutofillPackage | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    api.autofillPackage(app.meta.id).then(setData).catch(() => {})
  }, [app.meta.id])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDownload = () => {
    window.open(apiUrl(`/api/applications/${app.meta.id}/resume.pdf`), '_blank')
  }

  if (!data) return <div className="text-muted">Loading application package...</div>

  const profile = data.profile

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
  data.answers.forEach((answer) => {
    fields.push({ label: answer.question, value: answer.value == null ? '' : String(answer.value) })
  })

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Auto-fill Application Form</h3>
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
          The extension receives this complete approved package, fills unfamiliar forms, uploads the tailored resume, and stops before final submission.
        </p>
      </div>

      {data.missing.length > 0 && (
        <div className="error-banner">
          <strong>{data.missing.length} answers still need you.</strong>
          <div style={{ marginTop: 4 }}>{data.missing.map((item) => item.label).join(', ')}</div>
        </div>
      )}

      <section className="extension-preflight" data-tour="extension-preflight">
        <div className="extension-preflight-head">
          <div>
            <div className="card-kicker">Extension preflight</div>
            <h3>Approved package is ready to map</h3>
            <p className="text-muted">The extension scans the active page and previews its exact field matches before writing anything.</p>
          </div>
          <span className={`extension-ready-badge ${app.meta.status === 'ready' ? 'is-ready' : ''}`}>
            {app.meta.status === 'ready' ? 'Ready to autofill' : 'Review required'}
          </span>
        </div>
        <div className="extension-preflight-grid">
          <div><strong>{fields.filter((field) => field.value).length}</strong><span>known answers</span></div>
          <div><strong>{data.missing.length}</strong><span>need review</span></div>
          <div><strong>{app.has_pdf ? 'Yes' : 'No'}</strong><span>tailored PDF</span></div>
          <div><strong>Never</strong><span>auto-submits</span></div>
        </div>
        <div className="extension-preflight-flow">
          <span>1. Scan page</span><i>→</i><span>2. Review mappings</span><i>→</i><span>3. Fill fields</span><i>→</i><span>4. You submit</span>
        </div>
      </section>

      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', borderLeft: '3px solid var(--color-accent)' }}>
        <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 15 }}>How to use the Chrome Extension:</h4>
        <ol style={{ fontSize: 13, margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>
            Download <strong>ResumeDB-Chrome-Extension.zip</strong> from this project&apos;s submission files and unzip it.
          </li>
          <li>
            Open Chrome and navigate to <strong>chrome://extensions</strong>.
          </li>
          <li>
            Enable <strong>Developer mode</strong> (toggle switch in the top-right corner).
          </li>
          <li>
            Click <strong>Load unpacked</strong> and select the extracted <code>ResumeDB-Chrome-Extension</code> folder. The hosted Vercel app and Railway API are already configured.
          </li>
          <li>
            Open the job application page (Lever, Greenhouse, etc.), open the extension from your browser toolbar, select <strong>{app.meta.company} - {app.meta.role}</strong>, then choose <strong>Scan page before filling</strong> and <strong>Fill mapped fields</strong>.
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

function ReviewPanel({ appId }: { appId: string }) {
  const [report, setReport] = useState<ReadinessReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runReview = useCallback(async () => {
    setError(null)
    try {
      setReport(await api.readiness(appId))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [appId])

  useEffect(() => {
    runReview()
  }, [runReview])

  if (error) {
    return (
      <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-md)', background: 'var(--color-neutral-100)', color: 'var(--color-accent-800)', fontSize: 13, marginBottom: 'var(--space-4)' }}>
        Failed to load review: {error}
        <button className="btn btn-primary" style={{ display: 'block', marginTop: 8, padding: '4px 10px', fontSize: 12 }} onClick={runReview}>Retry</button>
      </div>
    )
  }

  if (!report) return null

  const issues = [
    ...report.blockers.map((item) => ({ ...item, kind: 'blocker' as const })),
    ...report.warnings.map((item) => ({ ...item, kind: 'warning' as const })),
  ]

  return (
    <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Application readiness</h3>
          <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 0' }}>Required facts block approval. Optional profile gaps remain visible but never get inferred.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Readiness score</span>
            <div style={{ fontSize: 22, fontWeight: 700, color: report.ready ? '#2e7d32' : '#c62828' }}>
              {report.score}%
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={runReview}>Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {issues.map((item) => (
            <div key={`${item.kind}-${item.key}`} style={{ display: 'flex', gap: 12, padding: 'var(--space-3)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', background: 'var(--color-neutral-100)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.kind === 'blocker' ? '#f44336' : '#ff9800', marginTop: 6, flex: 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{item.label}</strong>
                  <span className="tag tag-neutral" style={{ fontSize: 9, padding: '1px 6px', textTransform: 'uppercase' }}>{item.kind}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--color-neutral-800)' }}>{item.message}</div>
              </div>
            </div>
        ))}

        {issues.length === 0 && (
          <div className="text-muted" style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 13, border: '1px dashed var(--color-divider)', borderRadius: 'var(--radius-md)' }}>
            No blockers or warnings. This application is ready for human approval.
          </div>
        )}
      </div>
    </div>
  )
}
