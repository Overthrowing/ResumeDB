import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { CheckSquare, ChevronRight, Download, Plus, RotateCcw, Trash2, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type AppMeta, type AppStatus } from '@/lib/api'
import { useActiveTurns } from '@/chat/active'
import ChatRail from '@/components/ChatRail'
import ErrorText from '@/components/ErrorText'
import { Page, PageHeader } from '@/components/Page'
import StatusPill from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PHASES, byPhase, statusMeta } from '@/lib/status'
import { DEFAULT_TEMPLATE } from '@/lib/templates'
import { cn } from '@/lib/utils'

export default function Applications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const working = new Set(useActiveTurns().map((t) => t.scope))

  const appsQ = useQuery({ queryKey: ['apps'], queryFn: api.applications })
  const apps = appsQ.data ?? []
  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter)
  const counts = apps.reduce<Record<string, number>>((acc, a) => ((acc[a.status] = (acc[a.status] || 0) + 1), acc), {})

  const reload = () => qc.invalidateQueries({ queryKey: ['apps'] })

  // Selection survives filter changes only for rows still on screen: acting on
  // an application you can no longer see is how bulk delete goes wrong.
  const visibleIds = filtered.map((a) => a.id)
  const selectedVisible = visibleIds.filter((id) => selected.has(id))
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div className="flex min-h-0 flex-1">
      <Page>
        <PageHeader
          title="Applications"
          subtitle="Each is a workbench: one job, tailored from your Library."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant={selecting ? 'default' : 'outline'}
                onClick={() => {
                  setSelecting((s) => !s)
                  setSelected(new Set())
                }}
              >
                <CheckSquare className="size-4" />
                {selecting ? 'Done' : 'Select'}
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                New application
              </Button>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({apps.length})
          </FilterChip>
          {PHASES.map((phase) => {
            const shown = byPhase(phase.id).filter((s) => counts[s.id] || filter === s.id)
            if (shown.length === 0) return null
            return (
              <div key={phase.id} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{phase.label}</span>
                {shown.map((s) => (
                  <FilterChip
                    key={s.id}
                    active={filter === s.id}
                    onClick={() => setFilter(s.id as AppStatus)}
                  >
                    {s.label} ({counts[s.id] || 0})
                  </FilterChip>
                ))}
              </div>
            )
          })}
        </div>

        <ErrorText error={appsQ.error} className="mb-3" />

        {selecting && (
        <SelectionBar
          ids={selectedVisible}
          apps={apps}
          working={working}
          onClear={() => setSelected(new Set())}
          onDone={() => {
            setSelected(new Set())
            reload()
          }}
        />
        )}

        {/* Below ~560px of content (a wide chat rail on a small window) the
            columns would compress into unreadable towers; scroll instead. */}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              {/* Role absorbs the slack; the rest stay on one line, so a long
                  role title cannot squeeze them into four-line wraps. */}
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                {selecting && (
                <th className="w-8 pl-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="size-3.5 accent-[var(--primary)] align-middle"
                    checked={visibleIds.length > 0 && selectedVisible.length === visibleIds.length}
                    // partially selected reads as neither on nor off
                    ref={(el) => {
                      if (el) el.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleIds.length
                    }}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(visibleIds) : new Set())
                    }
                  />
                </th>
                )}
                <th className="w-full px-4 py-2.5 font-medium">Role</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">Company</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">Deadline</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) =>
                /* meta.yaml did not parse: the workbench has nothing to load, so
                   this row reports the failure instead of navigating. */
                a.error ? (
                  <tr key={a.id} className="border-b last:border-0">
                    {/* still selectable: an unreadable application is exactly
                        the kind you want to delete in bulk */}
                    {selecting && (
                      <td className="pl-3">
                        <RowCheckbox a={a} checked={selected.has(a.id)} onToggle={() => toggle(a.id)} />
                      </td>
                    )}
                    <td className="px-4 py-3 font-heading text-[15px] font-semibold text-destructive">{a.role}</td>
                    <td className="px-4 py-3">{a.company}</td>
                    <td className="px-4 py-3" colSpan={3}>
                      <span className="flex items-start gap-1.5 text-[11px] text-destructive">
                        <TriangleAlert className="mt-px size-3 flex-none" />
                        <span className="whitespace-pre-wrap break-words">{a.error}</span>
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={a.id}
                    className={cn(
                      'cursor-pointer border-b last:border-0 hover:bg-accent/40',
                      selected.has(a.id) && 'bg-accent/50',
                    )}
                    onClick={() => (selecting ? toggle(a.id) : navigate(`/applications/${a.id}`))}
                  >
                    {selecting && (
                      <td className="pl-3">
                        <RowCheckbox a={a} checked={selected.has(a.id)} onToggle={() => toggle(a.id)} />
                      </td>
                    )}
                    <td className="relative px-4 py-3 font-heading text-[15px] font-semibold">
                      {/* Turns keep running after you navigate away, so the list
                          says which applications are mid-turn. Absolute, inside
                          the cell padding: a marker that shifted the title would
                          knock this row out of line with every other one. */}
                      {working.has(`app:${a.id}`) && (
                        <span
                          title="Working - the assistant is mid-turn on this application"
                          className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 animate-pulse rounded-full bg-primary"
                        />
                      )}
                      {/* The row onClick is mouse-only; this link is the keyboard
                          route in. stopPropagation keeps the row from navigating
                          a second time when the link itself is activated. */}
                      <Link
                        to={`/applications/${a.id}`}
                        className="outline-none focus-visible:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.role}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{a.company}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusPill status={a.status} className="inline-flex tracking-wide" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{a.deadline || '-'}</td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <ChevronRight className="size-4" />
                    </td>
                  </tr>
                ),
              )}
              {filtered.length === 0 && !appsQ.isPending && (
                <tr>
                  <td colSpan={selecting ? 6 : 5} className="px-4 py-6 text-muted-foreground">
                    {filter === 'all'
                      ? 'No applications yet.'
                      : `No ${statusMeta(filter).label.toLowerCase()} applications.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <NewApplicationDialog
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            reload()
            navigate(`/applications/${id}`)
          }}
        />
      </Page>

      <ChatRail
        scope="apps"
        title="Applications assistant"
        subtitle="Creates & tracks applications"
        placeholder="Paste a job link to start an application, or ask about your pipeline…"
        onDone={reload}
      />
    </div>
  )
}

/** Row checkbox. stopPropagation on the cell, not just the input: the row's
 * onClick navigates, and a click that lands on the padding around a checkbox
 * should still not take you off the page you are selecting on. */
function RowCheckbox({ a, checked, onToggle }: { a: AppMeta; checked: boolean; onToggle: () => void }) {
  return (
    <span className="flex items-center py-3" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        aria-label={`Select ${a.company} ${a.role}`}
        className="size-3.5 accent-[var(--primary)]"
        checked={checked}
        onChange={onToggle}
      />
    </span>
  )
}

type BulkAction = 'delete' | 'reset'

const ACTION_COPY: Record<BulkAction, { title: string; verb: string; body: string; danger: boolean }> = {
  delete: {
    title: 'Delete applications',
    verb: 'Delete',
    body:
      'Removes the folder and everything in it. Each deletion is checkpointed, so you can still ' +
      'recover it from the Versions tab of any application until you prune history.',
    danger: true,
  },
  reset: {
    title: 'Reset applications',
    verb: 'Reset',
    body:
      'Clears the resume, its PDF, the decisions log, and the chat history, and sets status back ' +
      'to Not started. The job description, notes, deadline, and source link are kept, so you can ' +
      're-tailor without re-entering the job.',
    danger: false,
  },
}

function SelectionBar({
  ids,
  apps,
  working,
  onClear,
  onDone,
}: {
  ids: string[]
  apps: AppMeta[]
  working: Set<string>
  onClear: () => void
  onDone: () => void
}) {
  const [confirming, setConfirming] = useState<BulkAction | null>(null)
  const [busy, setBusy] = useState(false)

  const chosen = apps.filter((a) => ids.includes(a.id))
  // A turn mid-run owns the folder; deleting or wiping it leaves the agent
  // writing into nothing. Those rows are skipped rather than silently included.
  const blocked = chosen.filter((a) => working.has(`app:${a.id}`))
  const actionable = chosen.filter((a) => !working.has(`app:${a.id}`))
  const exportable = chosen.filter((a) => a.has_pdf)

  const run = async (action: BulkAction) => {
    setBusy(true)
    const call = action === 'delete' ? api.deleteApplication : api.resetApplication
    const failures: string[] = []
    for (const a of actionable) {
      try {
        await call(a.id)
      } catch (e) {
        failures.push(`${a.company}: ${(e as Error).message}`)
      }
    }
    setBusy(false)
    setConfirming(null)
    const done = actionable.length - failures.length
    if (done) toast.success(`${ACTION_COPY[action].verb}d ${done} application${done === 1 ? '' : 's'}.`)
    // never a bare success toast when something failed - that is how a silent
    // partial failure gets mistaken for a clean run
    if (failures.length) toast.error(`${failures.length} failed. ${failures[0]}`)
    onDone()
  }

  const setStatus = async (status: AppStatus) => {
    setBusy(true)
    const failures: string[] = []
    for (const a of chosen) {
      try {
        await api.saveAppMeta(a.id, { status })
      } catch (e) {
        failures.push(`${a.company}: ${(e as Error).message}`)
      }
    }
    setBusy(false)
    const done = chosen.length - failures.length
    if (done) toast.success(`Set ${done} to ${statusMeta(status).label}.`)
    if (failures.length) toast.error(`${failures.length} failed. ${failures[0]}`)
    onDone()
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-accent/60 px-3 py-2">
      <span className="text-[13px] font-medium">
        {ids.length ? `${ids.length} selected` : 'Select applications'}
      </span>
      {blocked.length > 0 && (
        <span className="text-[11px] text-muted-foreground">
          ({blocked.length} mid-turn, skipped by delete and reset)
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Select value="" onValueChange={(v) => setStatus(v as AppStatus)} disabled={busy || !ids.length}>
          <SelectTrigger size="sm" className="w-36" aria-label="Set status">
            <SelectValue placeholder="Set status…" />
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
        <Button variant="outline" size="sm" asChild={exportable.length > 0} disabled={exportable.length === 0}>
          {exportable.length > 0 ? (
            <a href={api.exportUrl(exportable.map((a) => a.id))} download>
              <Download className="size-3.5" />
              Export {exportable.length} PDF{exportable.length === 1 ? '' : 's'}
            </a>
          ) : (
            <span>
              <Download className="size-3.5" />
              No rendered PDFs
            </span>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={busy || !actionable.length} onClick={() => setConfirming('reset')}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button variant="outline" size="sm" disabled={busy || !actionable.length} onClick={() => setConfirming('delete')}>
          <Trash2 className="size-3.5 text-destructive" />
          Delete
        </Button>
        <Button variant="ghost" size="icon-sm" title="Clear selection" onClick={onClear}>
          <X className="size-3.5" />
        </Button>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="sm:max-w-lg">
          {confirming && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">{ACTION_COPY[confirming].title}</DialogTitle>
                <DialogDescription>{ACTION_COPY[confirming].body}</DialogDescription>
              </DialogHeader>
              <ul className="max-h-48 overflow-y-auto rounded-md border bg-card px-3 py-2 text-[13px]">
                {actionable.map((a) => (
                  <li key={a.id} className="truncate py-0.5">
                    {a.company} <span className="text-muted-foreground">· {a.role}</span>
                  </li>
                ))}
              </ul>
              {blocked.length > 0 && (
                <p className="text-[12px] text-muted-foreground">
                  {blocked.length} selected application{blocked.length === 1 ? ' is' : 's are'} mid-turn and will be
                  skipped. Stop the turn first if you meant to include {blocked.length === 1 ? 'it' : 'them'}.
                </p>
              )}
              <DialogFooter>
                <Button variant="secondary" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button
                  variant={ACTION_COPY[confirming].danger ? 'destructive' : 'default'}
                  disabled={busy}
                  onClick={() => run(confirming)}
                >
                  {busy ? 'Working…' : `${ACTION_COPY[confirming].verb} ${actionable.length}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-accent font-medium text-accent-foreground'
          : 'border-border text-muted-foreground hover:bg-accent/50',
      )}
    >
      {children}
    </button>
  )
}

/** The one entry point for new applications: link, pasted posting, or both. */
function NewApplicationDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [busy, setBusy] = useState(false)
  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: api.templates, enabled: open })
  const templates = templatesQ.data ?? [DEFAULT_TEMPLATE]

  const create = async () => {
    if (!company.trim() || !role.trim()) {
      toast.error('Company and role are required.')
      return
    }
    setBusy(true)
    try {
      const res = await api.createApplication({
        company: company.trim(),
        role: role.trim(),
        jd_text: jdText,
        jd_url: jdUrl.trim() || undefined,
        template,
      })
      onCreated(res.id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">New application</DialogTitle>
          <DialogDescription>Paste the posting, drop a link for the agent to fetch, or both.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Role">
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </Field>
        </div>
        <Field label="Job description">
          <Textarea className="min-h-24" value={jdText} onChange={(e) => setJdText(e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <Field label="Posting link (agent fetches it)">
            <Input placeholder="https://…" value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} />
          </Field>
          <Field label="Template">
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-full" aria-label="Template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={create}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
