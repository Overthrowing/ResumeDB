import { useEffect, useMemo, useState } from 'react'
import { api, type AppMeta, type Profile } from './api'

const PROFILE_FIELDS: Array<[keyof Profile, string]> = [
  ['name', 'full name'],
  ['email', 'email'],
  ['phone', 'phone'],
  ['location', 'location'],
  ['college', 'college'],
  ['major', 'major'],
  ['degree', 'degree'],
  ['graduation_year', 'graduation year'],
  ['work_authorization', 'work authorization'],
  ['requires_sponsorship', 'sponsorship preference'],
]

export default function Dashboard({ onNavigate }: { onNavigate: (screen: 'agent' | 'applications' | 'settings') => void }) {
  const [profile, setProfile] = useState<Profile>({})
  const [apps, setApps] = useState<AppMeta[]>([])

  useEffect(() => {
    Promise.all([api.profile(), api.applications()]).then(([nextProfile, nextApps]) => {
      setProfile(nextProfile)
      setApps(nextApps)
    }).catch(() => {})
  }, [])

  const missing = useMemo(
    () => PROFILE_FIELDS.filter(([key]) => profile[key] == null || String(profile[key]).trim() === ''),
    [profile],
  )
  const counts = (status: AppMeta['status']) => apps.filter((app) => app.status === status).length
  const recent = apps.slice(0, 5)

  return (
    <div className="rs-scroll" style={{ flex: 1, padding: 'var(--space-6) var(--space-8)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="section-head" style={{ alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <div className="card-kicker">Career command center</div>
            <h1 style={{ fontSize: 40, margin: '2px 0 4px' }}>
              {profile.name ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Build your internship pipeline'}
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>Your agent discovers, qualifies, and prepares applications. You review and submit.</p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('agent')}>Ask the career agent</button>
        </div>

        <div className="metric-grid">
          <Metric label="Tracked" value={apps.length} detail="all applications" />
          <Metric label="Drafts" value={counts('draft')} detail="waiting for review" />
          <Metric label="Ready" value={counts('ready')} detail="approved to autofill" accent />
          <Metric label="Submitted" value={counts('submitted')} detail="completed applications" />
        </div>

        <div className="dashboard-grid">
          <section className="card" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div className="card-kicker">Application queue</div>
                <h3 style={{ fontSize: 22, marginTop: 3 }}>Keep the pipeline moving</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => onNavigate('applications')}>View all</button>
            </div>
            {recent.map((app) => (
              <div key={app.id} className="dashboard-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{app.role}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{app.company}</div>
                </div>
                <span className={`status-pill status-${app.status}`}>{app.status.replace('_', ' ')}</span>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="empty-state">Tell the career agent what you are looking for, or give it any job URL.</div>
            )}
          </section>

          <section className="card" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
            <div>
              <div className="card-kicker">Knowledge readiness</div>
              <h3 style={{ fontSize: 22, marginTop: 3 }}>{missing.length ? `${missing.length} facts need you` : 'Profile ready'}</h3>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
                The agent uses everything you provide, but never guesses factual application answers.
              </p>
            </div>
            {missing.slice(0, 5).map(([key, label]) => (
              <div key={key} className="dashboard-row">
                <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{label}</span>
                <span className="tag tag-outline">Missing</span>
              </div>
            ))}
            {missing.length === 0 && <div className="empty-state">Your core application facts are complete.</div>}
            <button className="btn btn-secondary" onClick={() => onNavigate('settings')}>Complete profile</button>
          </section>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, detail, accent = false }: { label: string; value: number; detail: string; accent?: boolean }) {
  return (
    <div className={`metric-tile${accent ? ' metric-tile-accent' : ''}`}>
      <div className="card-kicker">{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 1 }}>{value}</div>
      <div className="text-muted" style={{ fontSize: 11 }}>{detail}</div>
    </div>
  )
}
