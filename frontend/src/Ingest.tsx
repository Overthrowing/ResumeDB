import { useEffect, useState, type FormEvent } from 'react'
import { api, type JobLead, type ResearchRun } from './api'

export default function Ingest() {
  const [tab, setTab] = useState<'ingest' | 'discover'>('ingest')
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [job, setJob] = useState<JobLead | null>(null)
  const [summary, setSummary] = useState('')
  const [searchResults, setSearchResults] = useState<JobLead[] | null>(null)
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)

  const [runs, setRuns] = useState<ResearchRun[]>([])
  const [templates, setTemplates] = useState<string[]>(['classic'])
  const [selectedTemplate, setSelectedTemplate] = useState('classic')

  const refreshRuns = () => {
    api.runs(10)
      .then(setRuns)
      .catch(() => {})
  }

  useEffect(() => {
    refreshRuns()
    api.templates()
      .then(setTemplates)
      .catch(() => {})
  }, [])

  const handleIngest = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || busy) return
    setBusy(true)
    setError(null)
    setJob(null)
    setSearchResults(null)
    setAdded(false)
    try {
      const res = await api.agentIngest({ input: input.trim() })
      setJob(res.job)
      setSummary(res.summary)
      refreshRuns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest role.')
    } finally {
      setBusy(false)
    }
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim() || busy) return
    setBusy(true)
    setError(null)
    setJob(null)
    setSearchResults(null)
    setAdded(false)
    try {
      const res = await api.agentSearch({ query: query.trim() })
      setSearchResults(res.jobs)
      setSummary(res.summary)
      refreshRuns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleRestoreRun = async (run: ResearchRun) => {
    setError(null)
    setJob(null)
    setSearchResults(null)
    setAdded(false)
    try {
      const full = await api.run(run.id)
      const res = full.result
      if (!res) throw new Error('This run has no saved results.')
      setSummary(res.summary || '')
      if (run.kind === 'ingest' && res.job) {
        setJob(res.job)
        setTab('ingest')
      } else if (run.kind === 'search' && res.jobs) {
        setSearchResults(res.jobs)
        setTab('discover')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore run.')
    }
  }

  const handleTrackRole = async (e: FormEvent) => {
    e.preventDefault()
    if (!job || !job.company.trim() || !job.role.trim() || adding) return
    setAdding(true)
    setError(null)
    try {
      // Compose full job description
      const salaryStr = job.salary_amount
        ? `\n\nSalary: ${job.salary_amount} ${job.salary_currency || 'USD'} / ${job.salary_period || 'year'}`
        : ''
      const details = `Location: ${job.location || 'Remote/Not listed'}\nTerm: ${job.term || 'Not listed'}\nDepartment/Team: ${job.department || ''} ${job.team || ''}${salaryStr}\n\nWhat they look for:\n${job.what_they_look_for || ''}\n\nGood to know:\n${job.good_to_know || ''}\n\nJob Description:\n${job.job_description || ''}`

      const res = await api.createApplication({
        company: job.company.trim(),
        role: job.role.trim(),
        jd_text: details,
        jd_url: job.application_url || undefined,
        template: selectedTemplate,
      })

      // Update metadata fields like deadline and source url
      const metaUpdates: any = {}
      if (job.deadline) metaUpdates.deadline = job.deadline
      if (job.source_url) metaUpdates.source = job.source_url
      await api.saveAppMeta(res.id, metaUpdates)

      setAdded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add application.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Left sidebar / control area */}
      <div style={{ width: 380, borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 'var(--space-3)', background: 'var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            <button
              className="btn"
              style={{
                flex: 1,
                border: 'none',
                background: tab === 'ingest' ? 'var(--color-bg)' : 'transparent',
                boxShadow: tab === 'ingest' ? 'var(--shadow-sm)' : 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                padding: '6px 12px',
                fontFamily: 'var(--font-heading)'
              }}
              onClick={() => setTab('ingest')}
            >
              Scrape & Ingest
            </button>
            <button
              className="btn"
              style={{
                flex: 1,
                border: 'none',
                background: tab === 'discover' ? 'var(--color-bg)' : 'transparent',
                boxShadow: tab === 'discover' ? 'var(--shadow-sm)' : 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                padding: '6px 12px',
                fontFamily: 'var(--font-heading)'
              }}
              onClick={() => setTab('discover')}
            >
              Discover Roles
            </button>
          </div>

          {tab === 'ingest' ? (
            <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="field">
                <label>Job Posting URL or Listing Text</label>
                <textarea
                  className="input"
                  style={{ minHeight: 120, fontSize: 13 }}
                  required
                  placeholder="Paste a Greenhouse, Lever, or other job URL, or paste the raw listing text directly..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
                {busy ? 'Extracting...' : 'Extract Job Details'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="field">
                <label>What roles should the agent search for?</label>
                <textarea
                  className="input"
                  style={{ minHeight: 80, fontSize: 13 }}
                  required
                  placeholder="e.g., Summer 2027 Software Engineering internships in New York prioritizing Rust or TypeScript"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy || !query.trim()}>
                {busy ? 'Searching...' : 'Search for Roles'}
              </button>
            </form>
          )}
        </div>

        {/* Recent Runs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 14, margin: '0 0 var(--space-2)' }}>Recent Agent Runs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {runs.map((run) => (
              <div
                key={run.id}
                className="card"
                style={{
                  cursor: run.status === 'completed' ? 'pointer' : 'default',
                  padding: 'var(--space-2) var(--space-3)',
                  borderColor: run.status === 'failed' ? 'var(--color-accent-300)' : 'var(--color-divider)',
                  background: 'transparent'
                }}
                onClick={() => run.status === 'completed' && handleRestoreRun(run)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                    {run.kind}
                  </span>
                  <span className="text-muted">{new Date(run.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.query}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                  {run.status === 'pending' ? '⏳ In progress...' : run.status === 'failed' ? `❌ ${run.error || 'Failed'}` : run.summary}
                </div>
              </div>
            ))}
            {runs.length === 0 && (
              <div className="text-muted" style={{ fontSize: 13 }}>No recent runs. Try searching or ingesting a role above.</div>
            )}
          </div>
        </div>
      </div>

      {/* Right pane: Preview / Review / Results */}
      <div className="rs-scroll" style={{ flex: 1, padding: 'var(--space-6) var(--space-8)', overflowY: 'auto' }}>
        {error && (
          <div style={{ color: 'var(--color-accent-700)', border: '1px solid var(--color-accent-300)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {busy ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-neutral-600)' }}>
            <div className="loader" style={{ border: '4px solid var(--color-neutral-300)', borderTop: '4px solid var(--color-accent)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h3 style={{ margin: 0 }}>Agent is working...</h3>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>This can take up to a minute. Fetching web data and structuring results.</p>
          </div>
        ) : added ? (
          <div className="card" style={{ maxWidth: 600, padding: 'var(--space-6)', borderColor: 'var(--color-accent)', margin: 'auto' }}>
            <h2 style={{ color: 'var(--color-accent)', margin: 0, fontSize: 28 }}>Success!</h2>
            <p style={{ marginTop: 'var(--space-2)' }}>The application has been added to your tracker as Draft. You can now tailor your resume for it.</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" onClick={() => setAdded(false)}>Ingest another</button>
              <a href="/applications" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go to Applications</a>
            </div>
          </div>
        ) : job ? (
          <div style={{ maxWidth: 640 }}>
            <div style={{ marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)', paddingBottom: 'var(--space-3)' }}>
              <h2 style={{ margin: 0 }}>Review Extracted Role</h2>
              {summary && <p className="text-muted" style={{ fontSize: 14, margin: '4px 0 0' }}>{summary}</p>}
            </div>

            <form onSubmit={handleTrackRole}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="field">
                  <label>Company *</label>
                  <input
                    className="input"
                    required
                    value={job.company}
                    onChange={(e) => setJob({ ...job, company: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Role / Title *</label>
                  <input
                    className="input"
                    required
                    value={job.role}
                    onChange={(e) => setJob({ ...job, role: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="field">
                  <label>Location</label>
                  <input
                    className="input"
                    value={job.location || ''}
                    onChange={(e) => setJob({ ...job, location: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Term (e.g. Summer 2027)</label>
                  <input
                    className="input"
                    value={job.term || ''}
                    onChange={(e) => setJob({ ...job, term: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="field">
                  <label>Department / Team</label>
                  <input
                    className="input"
                    value={job.department || ''}
                    onChange={(e) => setJob({ ...job, department: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Application URL</label>
                  <input
                    className="input"
                    type="url"
                    value={job.application_url || ''}
                    onChange={(e) => setJob({ ...job, application_url: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '130px 100px 100px 140px', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="field">
                  <label>Salary Amount</label>
                  <input
                    className="input"
                    type="number"
                    value={job.salary_amount ?? ''}
                    onChange={(e) => setJob({ ...job, salary_amount: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div className="field">
                  <label>Currency</label>
                  <input
                    className="input"
                    value={job.salary_currency || ''}
                    onChange={(e) => setJob({ ...job, salary_currency: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Period</label>
                  <input
                    className="input"
                    placeholder="year, hour..."
                    value={job.salary_period || ''}
                    onChange={(e) => setJob({ ...job, salary_period: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Deadline (YYYY-MM-DD)</label>
                  <input
                    className="input"
                    type="date"
                    value={job.deadline || ''}
                    onChange={(e) => setJob({ ...job, deadline: e.target.value || null })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="field">
                  <label>Template</label>
                  <select className="input" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
                    {templates.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Priority (0 = Low, 3 = High)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={3}
                    value={job.priority ?? 0}
                    onChange={(e) => setJob({ ...job, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
                <label>What they look for</label>
                <textarea
                  className="input"
                  style={{ minHeight: 80 }}
                  value={job.what_they_look_for || ''}
                  onChange={(e) => setJob({ ...job, what_they_look_for: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
                <label>Good to know</label>
                <textarea
                  className="input"
                  style={{ minHeight: 80 }}
                  value={job.good_to_know || ''}
                  onChange={(e) => setJob({ ...job, good_to_know: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
                <label>Job description</label>
                <textarea
                  className="input"
                  style={{ minHeight: 140 }}
                  value={job.job_description || ''}
                  onChange={(e) => setJob({ ...job, job_description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setJob(null)}>Discard</button>
                <button className="btn btn-primary" type="submit" disabled={adding}>
                  {adding ? 'Tracking...' : 'Add to Applications'}
                </button>
              </div>
            </form>
          </div>
        ) : searchResults ? (
          <div>
            <div style={{ marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)', paddingBottom: 'var(--space-3)' }}>
              <h2 style={{ margin: 0 }}>Search Results</h2>
              {summary && <p className="text-muted" style={{ fontSize: 14, margin: '4px 0 0' }}>{summary}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
              {searchResults.map((lead, idx) => (
                <div key={idx} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 20 }}>{lead.role}</h3>
                      <p style={{ fontWeight: 600, color: 'var(--color-accent)', margin: '2px 0 6px' }}>{lead.company}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setJob(lead); setSearchResults(null); }}>
                      Review & Track
                    </button>
                  </div>

                  <div className="card-meta" style={{ marginBottom: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {lead.location && <span>📍 {lead.location}</span>}
                    {lead.term && <span>📅 {lead.term}</span>}
                    {lead.salary_amount && (
                      <span>
                        💰 {lead.salary_amount.toLocaleString()} {lead.salary_currency || 'USD'}
                        {lead.salary_period ? ` / ${lead.salary_period}` : ''}
                      </span>
                    )}
                    {lead.deadline && <span>⌛ Deadline: {lead.deadline}</span>}
                  </div>

                  {lead.what_they_look_for && (
                    <div style={{ fontSize: 13, marginBottom: 'var(--space-2)' }}>
                      <strong>What they look for:</strong> {lead.what_they_look_for}
                    </div>
                  )}

                  {lead.good_to_know && (
                    <div style={{ fontSize: 13, marginBottom: 'var(--space-2)' }}>
                      <strong>Good to know:</strong> {lead.good_to_know}
                    </div>
                  )}

                  {lead.application_url && (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <a href={lead.application_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, textDecoration: 'underline' }}>
                        Open official job page ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {searchResults.length === 0 && (
                <div className="text-muted" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                  No roles found. Try adjusting your search query.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-neutral-600)', textAlign: 'center', maxWidth: 440, margin: 'auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 style={{ margin: 0 }}>Results will appear here</h3>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 6 }}>
              Paste a job link or description on the left to extract its details, or enter a search query to discover openings across the web.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
