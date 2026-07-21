import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, type JobLead, type ResearchRun, type SearchSubscription } from './api'
import AgentTimeline from './AgentTimeline'

export default function Ingest() {
  const [command, setCommand] = useState('')
  const [summary, setSummary] = useState('')
  const [leads, setLeads] = useState<JobLead[]>([])
  const [subscriptions, setSubscriptions] = useState<SearchSubscription[]>([])
  const [busy, setBusy] = useState(false)
  const [workingLead, setWorkingLead] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeRun, setActiveRun] = useState<ResearchRun | null>(null)
  const activeRunId = activeRun?.id
  const activeRunStatus = activeRun?.status

  const refresh = useCallback(async () => {
    const [nextLeads, nextSubscriptions] = await Promise.all([api.jobLeads(), api.subscriptions()])
    setLeads(nextLeads)
    setSubscriptions(nextSubscriptions)
  }, [])

  useEffect(() => {
    refresh().catch((err) => setError((err as Error).message))
    api.runs(1).then((runs) => {
      const run = runs[0] ?? null
      setActiveRun(run)
      if (run && ['pending', 'running'].includes(run.status)) setBusy(true)
    }).catch(() => {})
  }, [refresh])

  useEffect(() => {
    if (!activeRunId || !activeRunStatus || !['pending', 'running'].includes(activeRunStatus)) return
    let cancelled = false
    const poll = async () => {
      try {
        const next = await api.run(activeRunId)
        if (cancelled) return
        setActiveRun(next)
        if (next.status === 'completed') {
          setSummary(next.summary)
          setBusy(false)
          await refresh()
        } else if (next.status === 'failed') {
          setError(next.error || next.summary)
          setBusy(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
          setBusy(false)
        }
      }
    }
    const timer = window.setInterval(poll, 700)
    poll()
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeRunId, activeRunStatus, refresh])

  useEffect(() => {
    if (!leads.some((lead) => lead.status === 'preparing')) return
    const timer = window.setInterval(() => refresh().catch(() => {}), 4000)
    return () => window.clearInterval(timer)
  }, [leads, refresh])

  const runAgent = async (event: FormEvent) => {
    event.preventDefault()
    if (!command.trim() || busy) return
    setBusy(true)
    setSummary('')
    setError('')
    try {
      const run = await api.startAgentCommand(command.trim())
      setActiveRun(run)
      setCommand('')
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const prepare = async (lead: JobLead) => {
    if (!lead.id) return
    setWorkingLead(lead.id)
    setError('')
    try {
      await api.prepareLead(lead.id)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setWorkingLead(null)
    }
  }

  const dismiss = async (lead: JobLead) => {
    if (!lead.id) return
    await api.dismissLead(lead.id)
    await refresh()
  }

  const saveGoal = async () => {
    if (!command.trim()) return
    setError('')
    try {
      await api.saveSubscription(command.trim())
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const runGoal = async (goal: SearchSubscription) => {
    setBusy(true)
    setError('')
    try {
      const result = await api.runSubscription(goal.id)
      setSummary(result.summary)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const activeLeads = useMemo(() => leads.filter((lead) => lead.status !== 'dismissed'), [leads])

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <aside className="agent-sidebar">
        <div>
          <div className="card-kicker">Autonomous discovery</div>
          <h2 style={{ fontSize: 28, margin: '4px 0 8px' }}>Career Agent</h2>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Give it a goal, a job URL, or a messy posting. It uses your complete knowledge base and decides how to act.
          </p>
        </div>

        <form onSubmit={runAgent} data-tour="agent-command">
          <textarea
            className="input agent-command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={'Try “Find product engineering internships in New York” or “Add this to my applications https://...”'}
            aria-label="Career agent command"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={busy || !command.trim()} style={{ flex: 1 }}>
              {busy ? 'Agent working...' : 'Run agent'}
            </button>
            <button className="btn btn-secondary" type="button" disabled={!command.trim()} onClick={saveGoal}>Save daily goal</button>
          </div>
        </form>

        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-4)', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <h4 style={{ fontSize: 16, margin: 0 }}>Daily goals</h4>
            <span className="text-muted" style={{ fontSize: 11 }}>{subscriptions.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subscriptions.map((goal) => (
              <button key={goal.id} className="saved-goal" disabled={busy} onClick={() => runGoal(goal)}>
                <span>{goal.query}</span>
                <small className={goal.last_error ? 'goal-error' : ''}>
                  {goal.last_error
                    ? `Needs attention: ${goal.last_error}`
                    : goal.last_run_at
                      ? `Last run ${new Date(goal.last_run_at).toLocaleDateString()}`
                      : 'Run now'}
                </small>
              </button>
            ))}
            {subscriptions.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>Save a natural-language goal and ResumeDB will revisit it daily.</div>}
          </div>
        </div>
      </aside>

      <main className="rs-scroll" style={{ flex: 1, padding: 'var(--space-6) var(--space-8)' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div className="section-head" style={{ alignItems: 'center' }}>
            <div>
              <div className="card-kicker">Discovery inbox</div>
              <h2 style={{ margin: '2px 0 4px' }}>{activeLeads.length} qualified roles</h2>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>High-confidence matches prepare automatically. Review the rest here.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => refresh().catch(() => {})}>Refresh</button>
          </div>

          {error && <div className="error-banner">{error}</div>}
          <AgentTimeline run={activeRun} />
          {summary && summary !== activeRun?.summary && <div className="agent-summary">{summary}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {activeLeads.map((lead) => (
              <JobCard
                key={lead.id}
                lead={lead}
                busy={workingLead === lead.id}
                onPrepare={() => prepare(lead)}
                onDismiss={() => dismiss(lead)}
              />
            ))}
            {!busy && activeLeads.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <h3 style={{ fontSize: 22 }}>Your discovery inbox is clear</h3>
                <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Ask the agent to discover internships or paste any job URL.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function JobCard({ lead, busy, onPrepare, onDismiss }: { lead: JobLead; busy: boolean; onPrepare: () => void; onDismiss: () => void }) {
  const score = lead.fit_score ?? 0
  const tone = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low'
  return (
    <article className="job-card">
      <div className={`fit-score fit-${tone}`}>
        <strong>{score}</strong>
        <span>fit</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 21, margin: 0 }}>{lead.role}</h3>
            <div style={{ color: 'var(--color-accent-800)', fontWeight: 600, fontSize: 13 }}>
              {lead.company}{lead.location ? ` · ${lead.location}` : ''}
            </div>
          </div>
          <span className={`status-pill status-${lead.status}`}>{lead.status || 'inbox'}</span>
        </div>
        {lead.fit_summary && <p style={{ fontSize: 13, margin: '10px 0 8px' }}>{lead.fit_summary}</p>}
        {(lead.evidence?.length ?? 0) > 0 && (
          <div className="evidence-row">
            {lead.evidence!.slice(0, 3).map((item) => <span key={item}>✓ {item}</span>)}
          </div>
        )}
        {(lead.missing_facts?.length ?? 0) > 0 && <div className="lead-note">Needs profile facts: {lead.missing_facts!.join(', ')}</div>}
        {(lead.hard_conflicts?.length ?? 0) > 0 && <div className="lead-note lead-conflict">Conflicts: {lead.hard_conflicts!.join(', ')}</div>}
        {lead.preparation_error && <div className="lead-note lead-conflict">Preparation paused: {lead.preparation_error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          {lead.status === 'preparing' ? (
            <span className="text-muted" style={{ fontSize: 12 }}><span className="agent-pulse" /> Preparing tailored application...</span>
          ) : lead.application_id ? (
            <span className="tag tag-accent">Draft tracked in Applications</span>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={onPrepare}>{busy ? 'Preparing...' : 'Prepare application'}</button>
          )}
          {(lead.application_url || lead.source_url) && (
            <a className="btn btn-ghost" href={lead.application_url || lead.source_url} target="_blank" rel="noreferrer">Open posting</a>
          )}
          <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--color-neutral-600)' }} onClick={onDismiss}>Dismiss</button>
        </div>
      </div>
    </article>
  )
}
