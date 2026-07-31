import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  BookOpen,
  Briefcase,
  ChartNoAxesCombined,
  LayoutTemplate,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--primary)" />
      <path d="M8 7h5.5a2.5 2.5 0 0 1 0 5H8zM8 12h5l3.5 5" stroke="var(--primary-foreground)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

const NAV = [
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/applications', label: 'Applications', icon: Briefcase },
  { to: '/outcomes', label: 'Outcomes', icon: ChartNoAxesCombined },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function App() {
  const navigate = useNavigate()
  const health = useQuery({ queryKey: ['health'], queryFn: api.health })
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: api.profile,
    enabled: health.data?.data_repo_ok === true,
  })
  const apps = useQuery({
    queryKey: ['apps'],
    queryFn: api.applications,
    enabled: health.data?.data_repo_ok === true,
  })

  useEffect(() => {
    if (health.data && !health.data.data_repo_ok) navigate('/onboarding', { replace: true })
  }, [health.data, navigate])

  if (health.isPending)
    return <div className="grid h-screen place-items-center text-sm text-muted-foreground">Loading…</div>

  if (health.isError)
    return (
      <div className="grid h-screen place-items-center">
        <div className="max-w-sm text-center">
          <div className="mb-2 flex justify-center"><Logo /></div>
          <h1 className="font-heading text-2xl font-semibold">Backend unreachable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The ResumeDB server on port 8000 is not responding. Start it with <code className="rounded bg-muted px-1">make dev</code>, then retry.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => health.refetch()}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    )

  const p = profile.data ?? {}
  const initials =
    (p.name || '')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-56 flex-none flex-col border-r bg-sidebar px-3 py-4">
        <div className="flex items-center gap-2.5 px-1.5 pb-5">
          <Logo />
          <span className="font-heading text-[19px] font-semibold tracking-tight">ResumeDB</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4 flex-none" />
              {label}
              {to === '/applications' && apps.data !== undefined && (
                <span className="ml-auto font-heading text-[11px] text-muted-foreground">{apps.data.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t px-2 py-2.5">
          <div className="grid size-8 flex-none place-items-center rounded-full bg-accent font-heading text-[13px] font-semibold text-accent-foreground">
            {initials}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px]">{p.name || 'Set up your profile'}</div>
            <div className="truncate text-[11px] text-muted-foreground">{p.email || ''}</div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
