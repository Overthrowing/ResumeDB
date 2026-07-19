import { useCallback, useEffect, useState } from 'react'
import { api, type Health, type Profile } from './api'
import { IconBriefcase, IconLogo, IconSettings, IconTemplate, IconUser } from './icons'
import Library from './Library'
import Applications from './Applications'
import Ingest from './Ingest'
import InterviewPrep from './InterviewPrep'
import Templates from './Templates'
import Settings from './Settings'
import Onboarding from './Onboarding'

type Screen = 'library' | 'applications' | 'ingest' | 'interview' | 'templates' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('library')
  const [health, setHealth] = useState<Health | null>(null)
  const [profile, setProfile] = useState<Profile>({})
  const [appCount, setAppCount] = useState<number | null>(null)

  const refresh = useCallback(() => {
    api.health().then(setHealth).catch(() => setHealth(null))
  }, [])
  useEffect(refresh, [refresh])
  useEffect(() => {
    if (!health?.data_repo_ok) return
    api.profile().then(setProfile).catch(() => {})
    api.applications().then((a) => setAppCount(a.length)).catch(() => {})
  }, [health])

  if (!health) return null
  if (!health.data_repo_ok) return <Onboarding health={health} onDone={refresh} />

  const initials =
    (profile.name || '')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'

  const nav: { id: Screen; label: string; icon: React.ReactNode; extra?: React.ReactNode }[] = [
    { id: 'library', label: 'Profile', icon: <IconUser /> },
    {
      id: 'applications',
      label: 'Applications',
      icon: <IconBriefcase />,
      extra:
        appCount !== null ? (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-neutral-600)', fontFamily: 'var(--font-heading)' }}>
            {appCount}
          </span>
        ) : undefined,
    },
    {
      id: 'ingest',
      label: 'Ingest & Discover',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
    {
      id: 'interview',
      label: 'Interview Prep',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
        </svg>
      ),
    },
    { id: 'templates', label: 'Templates', icon: <IconTemplate /> },
    { id: 'settings', label: 'Settings', icon: <IconSettings /> },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      <aside style={{ width: 232, flex: 'none', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', padding: 'var(--space-4) var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px var(--space-4)' }}>
          <IconLogo />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, letterSpacing: '-.01em' }}>ResumeDB</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((n) => (
            <div key={n.id} className={`nav-item${screen === n.id ? ' active' : ''}`} onClick={() => setScreen(n.id)}>
              {n.icon}
              {n.label}
              {n.extra}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 8px', borderTop: '1px solid var(--color-divider)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-accent-200)', color: 'var(--color-accent-800)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 13 }}>
            {initials}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13 }}>{profile.name || 'Set up your profile'}</div>
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{profile.email || ''}</div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {screen === 'library' && <Library />}
        {screen === 'applications' && <Applications onCountChange={setAppCount} />}
        {screen === 'ingest' && <Ingest />}
        {screen === 'interview' && <InterviewPrep />}
        {screen === 'templates' && <Templates />}
        {screen === 'settings' && <Settings health={health} onProfileChange={setProfile} />}
      </main>
    </div>
  )
}

