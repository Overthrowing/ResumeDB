import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Download, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  api,
  type Application,
  type AppStatus,
  type AuditResult,
  type RenderResult,
} from '@/lib/api'
import ChatRail from '@/components/ChatRail'
import MarkdownField from '@/components/MarkdownField'
import { PHASES, byPhase, isTerminal, statusMeta } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// The happy path shown as a strip. Terminal states are an end cap instead of a
// step, since they can be reached from anywhere.
const PIPELINE = [...byPhase('pre'), ...byPhase('submitted')]

/** One-click transitions offered for the current status, so the pipeline stays
 * current without hunting through the dropdown. */
const NEXT_ACTIONS: Record<string, { title: string; hint: string; actions: AppStatus[] }> = {
  awaiting_review: {
    title: 'Ready to lock in?',
    hint: 'Review everything, then finalize.',
    actions: ['ready'],
  },
  ready: {
    title: 'Locked and ready.',
    hint: 'Once you submit it, mark it applied.',
    actions: ['applied'],
  },
  applied: {
    title: 'Waiting to hear back.',
    hint: 'Record what happens so the Outcomes view stays honest.',
    actions: ['screen', 'rejected', 'ghosted'],
  },
  screen: {
    title: 'Screen or OA in progress.',
    hint: 'Did it move forward?',
    actions: ['interview', 'rejected', 'ghosted'],
  },
  interview: {
    title: 'Interviewing.',
    hint: 'How did it end?',
    actions: ['offer', 'rejected', 'ghosted'],
  },
  offer: {
    title: 'You have an offer.',
    hint: 'Close the loop.',
    actions: ['accepted', 'withdrawn'],
  },
}

const NEXT_LABELS: Record<string, string> = {
  screen: 'Heard back',
  rejected: 'Rejected',
  ghosted: 'No response',
  interview: 'Moved to interview',
  offer: 'Got an offer',
  accepted: 'Accepted',
  withdrawn: 'Withdrew',
  ready: 'Lock in',
  applied: 'Mark as applied',
}

type Tab = 'overview' | 'resume' | 'ats' | 'versions'

export default function Workspace() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('resume')
  const [renderCount, setRenderCount] = useState(0)
  const [lastRender, setLastRender] = useState<RenderResult | null>(null)

  const appQ = useQuery({ queryKey: ['app', id], queryFn: () => api.application(id), enabled: !!id })

  const reload = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['app', id] })
    qc.invalidateQueries({ queryKey: ['apps'] })
  }, [qc, id])

  const render = async () => {
    try {
      const r = await api.render(id)
      setLastRender(r)
      if (r.ok) setRenderCount((n) => n + 1)
      else toast.error(r.stderr.slice(0, 500))
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onRenderedResult = useCallback((pages: number, ok: boolean) => {
    setLastRender({ ok, pages, overflow: pages > 1, stderr: '' })
    if (ok) setRenderCount((n) => n + 1)
  }, [])

  if (appQ.isPending)
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (appQ.isError)
    return (
      <div className="p-6">
        <div className="mb-3 text-sm text-destructive">{(appQ.error as Error).message}</div>
        <Button variant="outline" onClick={() => navigate('/applications')}>
          <ChevronLeft className="size-4" /> Back to applications
        </Button>
      </div>
    )

  const app = appQ.data
  const meta = app.meta

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* header */}
      <div className="flex flex-none items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/applications" title="Back to applications" aria-label="Back to applications">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-lg font-semibold">
            {meta.role} · {meta.company}
          </div>
          <div className="text-xs text-muted-foreground">
            {meta.deadline ? `Deadline ${meta.deadline} · ` : ''}reads your Library + memory, writes this
            application's outputs
          </div>
        </div>
        <span className={cn('rounded px-2.5 py-0.5 text-[11px] font-semibold', statusMeta(meta.status).pill)}>
          {statusMeta(meta.status).label}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r">
          <div className="flex-none border-b px-4 pt-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList variant="line" className="bg-transparent p-0">
                {(
                  [
                    ['overview', 'Overview'],
                    ['resume', 'Resume'],
                    ['ats', 'ATS check'],
                    ['versions', 'Versions'],
                  ] as const
                ).map(([v, label]) => (
                  <TabsTrigger key={v} value={v} className="px-3">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {tab === 'overview' && <Overview app={app} onSaved={reload} />}
            {tab === 'resume' && (
              <ResumeTab app={app} renderCount={renderCount} lastRender={lastRender} onRender={render} onSaved={reload} />
            )}
            {tab === 'ats' && <AtsTab appId={id} />}
            {tab === 'versions' && <VersionsTab appId={id} onReverted={reload} />}
          </div>
        </div>

        <ChatRail
          scope={`app:${id}`}
          title="Tailoring assistant"
          subtitle="Library + memory + this job"
          placeholder="Ask to tailor the resume, tighten bullets, fit one page…"
          onRenderedResult={onRenderedResult}
          onDone={reload}
        />
      </div>
    </div>
  )
}

function Overview({ app, onSaved }: { app: Application; onSaved: () => void }) {
  const meta = app.meta
  const [fields, setFields] = useState({
    company: meta.company,
    role: meta.role,
    source: meta.source ?? '',
    deadline: meta.deadline ?? '',
    status: meta.status,
    outcome_note: meta.outcome_note ?? '',
  })
  const [jd, setJd] = useState(app.files['jd.md'] ?? '')
  const [notes, setNotes] = useState(app.files['notes.md'] ?? '')
  const [dirty, setDirty] = useState(false)
  const decisions = app.files['decisions.md'] ?? ''

  // Same hazard as the resume editor: the agent and the jd-from-link fetch
  // rewrite these files, and manage-applications updates meta via the API.
  const serverJd = app.files['jd.md'] ?? ''
  const serverNotes = app.files['notes.md'] ?? ''
  useEffect(() => {
    if (dirty) return
    setJd(serverJd)
    setNotes(serverNotes)
    setFields({
      company: meta.company,
      role: meta.role,
      source: meta.source ?? '',
      deadline: meta.deadline ?? '',
      status: meta.status,
      outcome_note: meta.outcome_note ?? '',
    })
  }, [serverJd, serverNotes, meta, dirty])

  const set = (patch: Partial<typeof fields>) => {
    setFields({ ...fields, ...patch })
    setDirty(true)
  }

  const save = async () => {
    try {
      await api.saveAppMeta(meta.id, fields)
      if (jd !== (app.files['jd.md'] ?? '')) await api.saveAppFile(meta.id, 'jd.md', jd)
      if (notes !== (app.files['notes.md'] ?? '')) await api.saveAppFile(meta.id, 'notes.md', notes)
      setDirty(false)
      onSaved()
      toast.success('Saved')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const transition = async (status: AppStatus) => {
    try {
      await api.saveAppMeta(meta.id, { status })
      setFields((f) => ({ ...f, status }))
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const closed = isTerminal(fields.status)
  const currentIdx = PIPELINE.findIndex((s) => s.id === fields.status)

  return (
    <div className="max-w-2xl">
      {/* pipeline: happy path as steps, terminal states as an end cap */}
      <div className="mb-6 flex items-center py-3">
        {PIPELINE.map((step, i) => {
          const isActive = step.id === fields.status
          const isPast = closed ? true : i < currentIdx
          return (
            <div key={step.id} className={cn('flex items-center', i < PIPELINE.length - 1 && 'flex-1')}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn('rounded-full transition-all', isActive ? 'size-4 ring-4 ring-primary/20' : 'size-2.5')}
                  style={{ background: isActive || isPast ? step.color : 'var(--border)' }}
                />
                <span
                  className={cn(
                    'whitespace-nowrap text-[10px]',
                    isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div
                  className="mx-1.5 mb-4 h-0.5 flex-1"
                  style={{ background: isPast ? PIPELINE[i + 1].color : 'var(--border)' }}
                />
              )}
            </div>
          )
        })}
        {closed && (
          <>
            <div className="mx-1.5 mb-4 h-0.5 w-6" style={{ background: statusMeta(fields.status).color }} />
            <div className="flex flex-col items-center gap-1">
              <div
                className="size-4 rounded-full ring-4 ring-primary/20"
                style={{ background: statusMeta(fields.status).color }}
              />
              <span className="whitespace-nowrap text-[10px] font-semibold">{statusMeta(fields.status).label}</span>
            </div>
          </>
        )}
      </div>

      {NEXT_ACTIONS[fields.status] && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/50 bg-accent/60 p-3">
          <div className="min-w-48 flex-1 text-[13px]">
            <strong className="text-accent-foreground">{NEXT_ACTIONS[fields.status]!.title}</strong>
            <div className="text-xs text-muted-foreground">{NEXT_ACTIONS[fields.status]!.hint}</div>
          </div>
          {NEXT_ACTIONS[fields.status]!.actions.map((a) => (
            <Button
              key={a}
              variant={a === 'rejected' || a === 'ghosted' ? 'outline' : 'default'}
              onClick={() => transition(a)}
            >
              {NEXT_LABELS[a] ?? statusMeta(a).label}
            </Button>
          ))}
        </div>
      )}

      {closed && (
        <Field label="Outcome note" className="mb-4">
          <Input
            placeholder="What happened? e.g. rejected after onsite, they went internal"
            value={fields.outcome_note}
            onChange={(e) => set({ outcome_note: e.target.value })}
          />
        </Field>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Company">
          <Input value={fields.company} onChange={(e) => set({ company: e.target.value })} />
        </Field>
        <Field label="Role">
          <Input value={fields.role} onChange={(e) => set({ role: e.target.value })} />
        </Field>
      </div>
      <div className="mb-4 flex gap-3">
        <Field label="Source link" className="flex-1">
          <Input value={fields.source} onChange={(e) => set({ source: e.target.value })} />
        </Field>
        <Field label="Deadline" className="w-32">
          <Input value={fields.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </Field>
        <Field label="Status" className="w-44">
          <Select value={fields.status} onValueChange={(v) => set({ status: v as AppStatus })}>
            <SelectTrigger className="w-full" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((phase) => (
                <SelectGroup key={phase.id}>
                  <SelectLabel>{phase.label}</SelectLabel>
                  {byPhase(phase.id).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Job description" className="mb-4">
        <MarkdownField
          label="Job description"
          value={jd}
          minHeight={150}
          placeholder="Paste the posting, or create the application from a link."
          onChange={(v) => {
            setJd(v)
            setDirty(true)
          }}
        />
      </Field>
      <div className="mb-4 rounded-lg border border-primary/30 bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5 font-heading text-sm font-semibold text-accent-foreground">
          <Sparkles className="size-3.5" />
          What to optimize for
          <span className="text-[11px] font-normal text-muted-foreground">
            - job-specific, lives & dies with this application
          </span>
        </div>
        <MarkdownField
          value={notes}
          minHeight={70}
          placeholder="Lead with X, downplay Y, mirror their language…"
          onChange={(v) => {
            setNotes(v)
            setDirty(true)
          }}
        />
      </div>
      {decisions && (
        <div className="mb-4">
          <div className="mb-2 font-heading text-sm font-semibold text-accent-foreground">
            Tailoring decisions
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
              - written by the agent each run, one bullet per choice with its JD evidence
            </span>
          </div>
          <MarkdownField value={decisions} minHeight={120} readOnly label="Tailoring decisions" />
        </div>
      )}
      <Button disabled={!dirty} onClick={save}>
        Save overview
      </Button>

      {(meta.history?.length ?? 0) > 1 && (
        <div className="mt-8">
          <div className="mb-2 font-heading text-sm font-semibold">Status history</div>
          <div className="flex flex-col gap-1.5">
            {meta.history!.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px]">
                <span className="size-2 flex-none rounded-full" style={{ background: statusMeta(h.status).color }} />
                <span className="w-32">{statusMeta(h.status).label}</span>
                <span className="text-xs text-muted-foreground">{h.date || 'undated'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResumeTab({
  app,
  renderCount,
  lastRender,
  onRender,
  onSaved,
}: {
  app: Application
  renderCount: number
  lastRender: RenderResult | null
  onRender: () => Promise<void>
  onSaved: () => void
}) {
  const [view, setView] = useState<'preview' | 'source'>('preview')
  const [source, setSource] = useState(app.files['resume.yaml'] ?? '')
  const [dirty, setDirty] = useState(false)

  // The agent rewrites resume.yaml behind our back; without this the editor
  // keeps the pre-agent text and "Save & render" would overwrite the tailoring.
  const serverSource = app.files['resume.yaml'] ?? ''
  useEffect(() => {
    if (!dirty) setSource(serverSource)
  }, [serverSource, dirty])

  const saveSource = async () => {
    try {
      await api.saveAppFile(app.meta.id, 'resume.yaml', source)
      setDirty(false)
      onSaved()
      await onRender()
      setView('preview')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">resume.pdf · Typst</Badge>
          {lastRender?.ok && (
            <Badge variant={lastRender.overflow ? 'destructive' : 'default'}>
              {lastRender.pages} page{lastRender.pages === 1 ? '' : 's'}
              {lastRender.overflow ? ' - overflows!' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-1.5">
          {/* h-7 track content + p-0.5 = h-8, matching the size="sm" buttons beside it */}
          <div className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            {(['preview', 'source'] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'flex h-7 items-center rounded-[5px] px-3 text-[13px] transition-colors',
                  view === v
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'preview' ? 'Preview' : 'resume.yaml'}
              </button>
            ))}
          </div>
          {view === 'source' ? (
            <Button variant="secondary" size="sm" disabled={!dirty} onClick={saveSource}>
              Save & render
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onRender}>
              <RefreshCw className="size-3.5" />
              Render
            </Button>
          )}
          <Button variant="secondary" size="sm" asChild>
            <a
              href={`/api/applications/${app.meta.id}/resume.pdf`}
              download={`resume-${app.meta.company.toLowerCase()}.pdf`}
            >
              <Download className="size-3.5" />
              Export
            </a>
          </Button>
        </div>
      </div>

      {view === 'preview' ? (
        app.has_pdf || renderCount > 0 ? (
          <iframe
            key={renderCount}
            title="resume preview"
            src={`/api/applications/${app.meta.id}/resume.pdf#toolbar=0&t=${renderCount}`}
            className="min-h-0 w-full flex-1 rounded-lg border bg-white"
          />
        ) : (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            Not rendered yet - hit Render, or ask the tailoring assistant to draft it.
          </div>
        )
      ) : (
        <textarea
          spellCheck={false}
          className="min-h-0 flex-1 resize-none rounded-lg border bg-card p-3 font-mono text-[12.5px] leading-normal outline-none focus:ring-2 focus:ring-ring/40"
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

function AtsTab({ appId }: { appId: string }) {
  const auditM = useMutation<AuditResult, Error>({ mutationFn: () => api.audit(appId) })
  const r = auditM.data

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold">ATS check</h3>
          <p className="text-[13px] text-muted-foreground">
            Machine-extraction diff of the rendered PDF plus an LLM keyword-coverage rubric against the JD.
          </p>
        </div>
        <Button onClick={() => auditM.mutate()} disabled={auditM.isPending}>
          {auditM.isPending ? 'Auditing…' : 'Run audit'}
        </Button>
      </div>

      {auditM.isError && <div className="text-[13px] text-destructive">{auditM.error.message}</div>}
      {auditM.isPending && (
        <div className="text-sm text-muted-foreground">Running extraction check and LLM rubric…</div>
      )}

      {r && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 font-heading text-sm font-semibold">
              Extraction check{' '}
              <Badge className="ml-1" variant={r.extraction.ok ? 'default' : 'destructive'}>
                {r.extraction.ok ? 'clean' : `${r.extraction.missing.length} problems`}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.extraction.error
                ? r.extraction.error
                : `${r.extraction.checked} fields checked against the PDF text layer.`}
            </div>
            {r.extraction.missing.map((m, i) => (
              <div key={i} className="mt-2 border-l-2 border-destructive pl-2.5 text-xs">
                <b>{m.field}</b>: missing {m.missing_tokens.join(', ')}
                <div className="text-muted-foreground">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 font-heading text-sm font-semibold">
              Keyword coverage
              {typeof r.llm.score === 'number' && <Badge className="ml-2">{Math.round(r.llm.score)}%</Badge>}
            </div>
            {r.llm.error ? (
              <div className="text-xs text-destructive">{r.llm.error}</div>
            ) : (
              <>
                {r.llm.notes && <p className="mb-2 text-[13px]">{r.llm.notes}</p>}
                <div className="flex flex-wrap gap-1">
                  {(r.llm.covered ?? []).map((k) => (
                    <Badge key={k} variant="secondary" className="bg-emerald-100 text-emerald-800">
                      {k}
                    </Badge>
                  ))}
                  {(r.llm.missing ?? []).map((k) => (
                    <Badge key={k} variant="secondary" className="bg-red-100 text-red-800">
                      {k}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function VersionsTab({ appId, onReverted }: { appId: string; onReverted: () => void }) {
  const qc = useQueryClient()
  const scope = `app:${appId}`
  const histQ = useQuery({ queryKey: ['history', scope], queryFn: () => api.history(scope) })
  const [diffSha, setDiffSha] = useState<string | null>(null)
  const diffQ = useQuery({
    queryKey: ['diff', diffSha],
    queryFn: () => api.historyDiff(diffSha!),
    enabled: !!diffSha,
  })

  const revert = async (sha: string) => {
    if (!confirm('Revert this checkpoint? A new checkpoint records the undo.')) return
    try {
      await api.revert(sha)
      qc.invalidateQueries({ queryKey: ['history', scope] })
      onReverted()
      toast.success('Reverted')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="max-w-2xl">
      <h3 className="mb-1 font-heading text-lg font-semibold">Versions</h3>
      <p className="mb-4 text-[13px] text-muted-foreground">
        Every change is a git checkpoint scoped to this application. Revert anything.
      </p>
      {histQ.isError && <div className="text-[13px] text-destructive">{(histQ.error as Error).message}</div>}
      <div className="flex flex-col">
        {(histQ.data ?? []).map((h) => (
          <div key={h.sha} className="group flex items-center gap-3 border-b py-2.5 text-[13px] last:border-0">
            <span className="text-xs text-muted-foreground">
              {new Date(h.timestamp * 1000).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <span className="min-w-0 flex-1 truncate">{h.subject}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] opacity-0 group-hover:opacity-100"
              onClick={() => setDiffSha(diffSha === h.sha ? null : h.sha)}
            >
              {diffSha === h.sha ? 'Hide diff' : 'Diff'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] opacity-0 group-hover:opacity-100"
              onClick={() => revert(h.sha)}
            >
              <RotateCcw className="size-2.5" />
              Revert
            </Button>
          </div>
        ))}
        {histQ.data?.length === 0 && <div className="py-4 text-sm text-muted-foreground">No checkpoints yet.</div>}
      </div>
      {diffSha && diffQ.data && (
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-normal">
          {diffQ.data}
        </pre>
      )}
    </div>
  )
}
