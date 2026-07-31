import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type AppMeta } from '@/lib/api'
import Sankey, { type Flow } from '@/components/Sankey'
import { STATUSES, STATUS_ORDER } from '@/lib/status'
import { cn } from '@/lib/utils'

/** Applications that ever reached one of these milestones, per their history. */
function reached(apps: AppMeta[], ids: string[]): AppMeta[] {
  return apps.filter((a) => (a.history ?? []).some((h) => ids.includes(h.status)))
}

function daysBetween(a: string, b: string): number | null {
  if (!a || !b) return null
  const d = (Date.parse(b) - Date.parse(a)) / 86_400_000
  return Number.isFinite(d) ? d : null
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function Outcomes() {
  const appsQ = useQuery({ queryKey: ['apps'], queryFn: api.applications })
  const apps = useMemo(() => appsQ.data ?? [], [appsQ.data])

  const { flows, corrections, stats } = useMemo(() => {
    const counts = new Map<string, Map<string, number>>()
    let corrections = 0
    for (const a of apps) {
      const hist = a.history ?? []
      for (let i = 0; i < hist.length - 1; i++) {
        const from = hist[i].status
        const to = hist[i + 1].status
        // A status can be corrected backwards ("applied" set back to
        // "in_progress"), which would make the graph cyclic and unlayoutable.
        // This chart is about progression, so count forward moves only.
        if (STATUS_ORDER.indexOf(to) <= STATUS_ORDER.indexOf(from)) {
          corrections++
          continue
        }
        const targets = counts.get(from) ?? new Map<string, number>()
        targets.set(to, (targets.get(to) ?? 0) + 1)
        counts.set(from, targets)
      }
    }
    const flows: Flow[] = []
    for (const [source, targets] of counts)
      for (const [target, value] of targets) flows.push({ source, target, value })

    const applied = reached(apps, ['applied'])
    const responded = reached(apps, ['screen', 'interview', 'offer', 'accepted'])
    const interviewed = reached(apps, ['interview', 'offer', 'accepted'])
    const offered = reached(apps, ['offer', 'accepted'])
    const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 100))

    const responseDays = responded
      .map((a) => {
        const hist = a.history ?? []
        const appliedAt = hist.find((h) => h.status === 'applied')?.date
        const firstReply = hist.find((h) => ['screen', 'interview', 'offer'].includes(h.status))?.date
        return appliedAt && firstReply ? daysBetween(appliedAt, firstReply) : null
      })
      .filter((d): d is number => d !== null && d >= 0)

    return {
      flows,
      corrections,
      stats: {
        total: apps.length,
        applied: applied.length,
        responseRate: pct(responded.length, applied.length),
        interviewRate: pct(interviewed.length, applied.length),
        offerRate: pct(offered.length, applied.length),
        medianResponse: median(responseDays),
      },
    }
  }, [apps])

  const byStatus = STATUSES.map((s) => ({
    ...s,
    count: apps.filter((a) => a.status === s.id).length,
  })).filter((s) => s.count > 0)

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="mb-5">
        <h2 className="font-heading text-[26px] font-semibold leading-tight">Outcomes</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Where your applications actually go, from the status history of every application.
        </p>
      </div>

      {appsQ.isError && (
        <div className="mb-3 text-[13px] text-destructive">{(appsQ.error as Error).message}</div>
      )}

      <div className="mb-6 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Applications" value={stats.total} />
        <Tile label="Applied" value={stats.applied} />
        <Tile label="Response rate" value={stats.responseRate} suffix="%" hint="reached a screen or beyond" />
        <Tile label="Interview rate" value={stats.interviewRate} suffix="%" hint="of applications sent" />
        <Tile label="Offer rate" value={stats.offerRate} suffix="%" hint="of applications sent" />
      </div>

      {stats.medianResponse !== null && (
        <p className="mb-6 text-[13px] text-muted-foreground">
          Median time from applying to a first response:{' '}
          <span className="font-medium text-foreground">{stats.medianResponse} days</span>.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-lg font-semibold">Flow</h3>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {byStatus.map((s) => (
            <span
              key={s.id}
              className={cn('rounded px-2 py-0.5 text-[11px] font-medium', s.pill)}
              title={`${s.count} currently ${s.label.toLowerCase()}`}
            >
              {s.label} {s.count}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-4xl">
        <Sankey flows={flows} />
        {corrections > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {corrections} backward status {corrections === 1 ? 'correction' : 'corrections'} excluded - the chart
            shows forward progression only.
          </p>
        )}
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  suffix = '',
  hint,
}: {
  label: string
  value: number | null
  suffix?: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="font-heading text-2xl font-semibold tabular-nums">
        {value === null ? <span className="text-muted-foreground">-</span> : `${value}${suffix}`}
      </div>
      <div className="text-[13px]">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
