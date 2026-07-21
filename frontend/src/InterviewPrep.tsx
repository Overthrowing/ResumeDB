import { useEffect, useState } from 'react'
import { api, type AppMeta, type InterviewQuestion } from './api'
import ChatRail from './ChatRail'

export default function InterviewPrep() {
  const [apps, setApps] = useState<AppMeta[]>([])
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'questions' | 'practice'>('questions')
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  useEffect(() => {
    api.applications()
      .then((data) => {
        // Show submitted and ready roles first
        const sorted = [...data].sort((a, b) => {
          const rank: Record<string, number> = { submitted: 1, ready: 2, draft: 3, in_progress: 4, not_started: 5 }
          return (rank[a.status] || 99) - (rank[b.status] || 99)
        })
        setApps(sorted)
        if (sorted.length > 0) {
          setSelectedAppId(sorted[0].id)
        }
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selectedAppId) return
    setQuestions([])
    setError(null)
    setExpandedQuestion(null)
    api.getInterviewQuestions(selectedAppId)
      .then(setQuestions)
      .catch((e) => setError(e.message))
  }, [selectedAppId])

  const selectedApp = apps.find(a => a.id === selectedAppId)

  const handleGenerate = async () => {
    if (!selectedAppId) return
    setBusy(true)
    setError(null)
    try {
      const qs = await api.generateInterviewQuestions(selectedAppId)
      setQuestions(qs)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const groupedQuestions = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    acc[q.type] = acc[q.type] || []
    acc[q.type].push(q)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Sidebar - Tracked Applications */}
      <div style={{ width: 280, borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-divider)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Select Application</h3>
          <p className="text-muted" style={{ fontSize: 11, margin: '2px 0 0' }}>Practice tailored questions for your tracked roles</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {apps.map((app) => {
              const active = app.id === selectedAppId
              return (
                <div
                  key={app.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '10px 12px',
                    borderColor: active ? 'var(--color-accent)' : 'var(--color-divider)',
                    background: active ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                  onClick={() => setSelectedAppId(app.id)}
                >
                  <strong style={{ fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {app.role}
                  </strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span className="text-muted">{app.company}</span>
                    <span style={{ fontSize: 10, textTransform: 'capitalize', fontWeight: 600, color: app.status === 'submitted' || app.status === 'ready' ? 'var(--color-accent)' : 'var(--color-neutral-600)' }}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
            {apps.length === 0 && (
              <div className="text-muted" style={{ padding: 'var(--space-4)', textAlign: 'center', fontSize: 13 }}>
                No active applications tracked yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {selectedApp ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Header / Tabs */}
            <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Interview Prep: {selectedApp.role}</h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12 }} className="text-muted">
                  <span>🏢 {selectedApp.company}</span>
                  <span>🗓️ Created {new Date(selectedApp.created).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 2, background: 'var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                <button
                  className="btn"
                  style={{
                    border: 'none',
                    background: activeTab === 'questions' ? 'var(--color-bg)' : 'transparent',
                    boxShadow: activeTab === 'questions' ? 'var(--shadow-sm)' : 'none',
                    borderRadius: 'calc(var(--radius-md) - 2px)',
                    padding: '4px 12px',
                    fontSize: 12
                  }}
                  onClick={() => setActiveTab('questions')}
                >
                  Question Bank
                </button>
                <button
                  className="btn"
                  style={{
                    border: 'none',
                    background: activeTab === 'practice' ? 'var(--color-bg)' : 'transparent',
                    boxShadow: activeTab === 'practice' ? 'var(--shadow-sm)' : 'none',
                    borderRadius: 'calc(var(--radius-md) - 2px)',
                    padding: '4px 12px',
                    fontSize: 12
                  }}
                  onClick={() => setActiveTab('practice')}
                >
                  Mock Interview Chat
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{ margin: 'var(--space-4) var(--space-6) 0', color: 'var(--color-accent-700)', border: '1px solid var(--color-accent-300)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Tab Panels */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              {activeTab === 'questions' ? (
                <div className="rs-scroll" style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
                  {busy ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--color-neutral-600)' }}>
                      <div className="loader" style={{ border: '4px solid var(--color-neutral-300)', borderTop: '4px solid var(--color-accent)', borderRadius: '50%', width: 36, height: 36, animation: 'spin 1s linear infinite', marginBottom: 12 }}></div>
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                      <strong style={{ fontSize: 15 }}>Generating Tailored Questions...</strong>
                      <span className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Analyzing JD requirements and matching candidate profile.</span>
                    </div>
                  ) : questions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
                      {Object.entries(groupedQuestions).map(([type, list]) => (
                        <div key={type}>
                          <h4 style={{ textTransform: 'capitalize', fontSize: 14, margin: '0 0 10px', color: 'var(--color-accent)', borderBottom: '1px solid var(--color-divider)', paddingBottom: 4 }}>
                            {type} Questions
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {list.map((q) => {
                              const isOpen = expandedQuestion === q.id
                              return (
                                <div key={q.id} className="card" style={{ padding: 'var(--space-3)' }}>
                                  <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={() => setExpandedQuestion(isOpen ? null : q.id)}
                                  >
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{q.question}</span>
                                    <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{isOpen ? '▲' : '▼'}</span>
                                  </div>
                                  
                                  {isOpen && (
                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--color-divider)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                      <div>
                                        <strong style={{ color: 'var(--color-neutral-700)', fontSize: 11, textTransform: 'uppercase' }}>Why they ask this:</strong>
                                        <div style={{ marginTop: 2, color: 'var(--color-neutral-800)' }}>{q.context}</div>
                                      </div>
                                      <div>
                                        <strong style={{ color: 'var(--color-neutral-700)', fontSize: 11, textTransform: 'uppercase' }}>Preparation tips:</strong>
                                        <div style={{ marginTop: 2, fontStyle: 'italic', color: 'var(--color-accent-800)' }}>{q.tips}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                      
                      <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: 12, padding: '6px 12px' }} onClick={handleGenerate}>
                        Regenerate Questions
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', textAlign: 'center', maxWidth: 420, margin: 'auto' }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>No questions generated yet</h3>
                      <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>Let the agent analyze the resume and job description to prepare behavioral and technical questions.</p>
                      <button className="btn btn-primary" onClick={handleGenerate}>
                        Generate AI Questions
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  <div style={{ flex: 1, padding: 'var(--space-6)' }} className="text-muted">
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--color-text)' }}>Practice Chat Area</h3>
                    <p style={{ fontSize: 13, margin: 0 }}>Use the side panel on the right to start a mock interview session. The assistant will behave as an interviewer from {selectedApp.company} and ask questions, wait for your reply, and provide feedback.</p>
                  </div>
                  <ChatRail
                    scope={`app:${selectedApp.id}:interview`}
                    title="Mock Interviewer"
                    subtitle={`Simulated interviewer for ${selectedApp.company}`}
                    placeholder="Type your response to start the mock interview..."
                    context={`Context: Candidate is practicing for the ${selectedApp.role} role at ${selectedApp.company}. Behave strictly as a friendly but rigorous technical/behavioral interviewer. Ask one question at a time and evaluate the user's answers.`}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-neutral-600)', textAlign: 'center', maxWidth: 400, margin: 'auto' }}>
            <h3 style={{ margin: 0 }}>Select an application to start</h3>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>Select a company from the sidebar to review interview questions and start practice chat mode.</p>
          </div>
        )}
      </div>
    </div>
  )
}
