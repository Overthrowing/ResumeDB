import { useCallback, useEffect, useState } from 'react'
import { api, type Health, type Profile } from './api'
import { IconBriefcase, IconLogo, IconSettings, IconUser } from './icons'
import Dashboard from './Dashboard'
import Library from './Library'
import Applications from './Applications'
import Ingest from './Ingest'
import Settings from './Settings'
import Onboarding from './Onboarding'
import GuidedDemo, { type DemoDestination } from './GuidedDemo'

type Screen = 'dashboard' | 'library' | 'applications' | 'agent' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [health, setHealth] = useState<Health | null>(null)
  const [profile, setProfile] = useState<Profile>({})
  const [appCount, setAppCount] = useState<number | null>(null)
  const [guidedDemo, setGuidedDemo] = useState(false)
  const [demoDestination, setDemoDestination] = useState<DemoDestination>({ screen: 'dashboard' })
  const navigateDemo = useCallback((destination: DemoDestination) => {
    setDemoDestination(destination)
    setScreen(destination.screen)
  }, [])
  const closeDemo = useCallback(() => setGuidedDemo(false), [])

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
    {
      id: 'dashboard',
      label: 'Home',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></svg>,
    },
    { id: 'library', label: 'Knowledge', icon: <IconUser /> },
    {
      id: 'agent',
      label: 'Career Agent',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>,
    },
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
    { id: 'settings', label: 'Profile & Settings', icon: <IconSettings /> },
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
            <div
              key={n.id}
              className={`nav-item${screen === n.id ? ' active' : ''}`}
              data-tour-nav={n.id}
              onClick={() => setScreen(n.id)}
            >
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
        {screen === 'dashboard' && (
          <Dashboard
            onNavigate={(next) => setScreen(next)}
            onStartDemo={() => {
              setScreen('dashboard')
              setGuidedDemo(true)
            }}
          />
        )}
        {screen === 'library' && <Library />}
        {screen === 'applications' && (
          <Applications
            onCountChange={setAppCount}
            tourView={guidedDemo ? demoDestination.view : undefined}
          />
        )}
        {screen === 'agent' && <Ingest />}
        {screen === 'settings' && <Settings health={health} onProfileChange={setProfile} />}
      </main>
      {guidedDemo && (
        <GuidedDemo
          onNavigate={navigateDemo}
          onClose={closeDemo}
        />
      )}
    </div>
  )
}
