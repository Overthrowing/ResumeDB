import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Activity } from 'lucide-react'
import { api, type AppMeta } from '@/lib/api'
import { useActiveTurns } from '@/chat/active'
import { cn } from '@/lib/utils'

/** Where a scope lives in the UI, and what to call it. */
function route(scope: string): string {
  if (scope === 'db') return '/library'
  if (scope.startsWith('app:')) return `/applications/${scope.slice(4)}`
  return '/applications'
}

function label(scope: string, apps: AppMeta[]): string {
  if (scope === 'db') return 'Library'
  if (scope === 'apps') return 'Applications'
  const app = apps.find((a) => a.id === scope.slice(4))
  return app ? `${app.company} · ${app.role}` : scope.slice(4)
}

function elapsed(since: number, now: number): string {
  const s = Math.max(0, Math.round(now / 1000 - since))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

/** Turns outlive the page that started them, so this is the one place that
 * answers "what is running right now" - including turns another tab started,
 * or ones this tab has never opened. */
export default function ActiveAgents() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const ref = useRef<HTMLDivElement>(null)

  const turns = useActiveTurns()
  const appsQ = useQuery({ queryKey: ['apps'], queryFn: api.applications })

  useEffect(() => {
    if (turns.length === 0) return // no timer while nothing is running
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [turns.length])

  useEffect(() => {
    if (!open) return
    const dismiss = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const running = turns.length > 0

  return (
    <div ref={ref} className="relative">
      {open && running && (
        <div className="absolute bottom-full left-0 z-20 mb-1.5 w-64 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="border-b px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Working now
          </div>
          {turns.map((t) => (
            <button
              key={t.scope}
              onClick={() => {
                navigate(route(t.scope))
                setOpen(false)
              }}
              className="flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left last:border-0 hover:bg-accent/50"
            >
              <span className="flex items-center gap-2">
                <span className="size-1.5 flex-none animate-pulse rounded-full bg-primary" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {label(t.scope, appsQ.data ?? [])}
                </span>
                <span className="flex-none whitespace-nowrap font-heading text-[11px] tabular-nums text-muted-foreground">
                  {elapsed(t.started, now)}
                </span>
              </span>
              {t.prompt && (
                <span className="line-clamp-2 pl-3.5 text-[11px] leading-snug text-muted-foreground">
                  {t.prompt}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!running}
        aria-expanded={open}
        title={running ? 'Show what the agents are working on' : 'No agents running'}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors',
          running
            ? 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            : 'cursor-default text-muted-foreground/60',
          open && 'bg-sidebar-accent text-sidebar-accent-foreground',
        )}
      >
        <Activity className={cn('size-3.5 flex-none', running && 'animate-pulse text-primary')} />
        {running ? `${turns.length} agent${turns.length === 1 ? '' : 's'} working` : 'No agents running'}
      </button>
    </div>
  )
}
