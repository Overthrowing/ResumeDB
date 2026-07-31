import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, type AppStatus } from '@/lib/api'
import ChatRail from '@/components/ChatRail'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { PHASES, byPhase, statusMeta } from '@/lib/status'

export default function Applications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')

  const appsQ = useQuery({ queryKey: ['apps'], queryFn: api.applications })
  const apps = appsQ.data ?? []
  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter)
  const counts = apps.reduce<Record<string, number>>((acc, a) => ((acc[a.status] = (acc[a.status] || 0) + 1), acc), {})

  const reload = () => qc.invalidateQueries({ queryKey: ['apps'] })

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-[26px] font-semibold leading-tight">Applications</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Each is a workbench: one job, tailored from your Library.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New application
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              filter === 'all'
                ? 'border-primary bg-accent font-medium text-accent-foreground'
                : 'border-border text-muted-foreground hover:bg-accent/50',
            )}
          >
            All ({apps.length})
          </button>
          {PHASES.map((phase) => {
            const shown = byPhase(phase.id).filter((s) => counts[s.id] || filter === s.id)
            if (shown.length === 0) return null
            return (
              <div key={phase.id} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{phase.label}</span>
                {shown.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilter(s.id as AppStatus)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      filter === s.id
                        ? 'border-primary bg-accent font-medium text-accent-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent/50',
                    )}
                  >
                    {s.label} ({counts[s.id] || 0})
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {appsQ.isError && <div className="mb-3 text-[13px] text-destructive">{(appsQ.error as Error).message}</div>}

        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Deadline</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                  onClick={() => navigate(`/applications/${a.id}`)}
                >
                  <td className="px-4 py-3 font-heading text-[15px] font-semibold">
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
                  <td className="px-4 py-3">{a.company}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
                        statusMeta(a.status).pill,
                      )}
                    >
                      {statusMeta(a.status).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.deadline || '-'}</td>
                  <td className="px-2 py-3 text-muted-foreground">
                    <ChevronRight className="size-4" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !appsQ.isPending && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted-foreground">
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
      </div>

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
  const [template, setTemplate] = useState('classic')
  const [busy, setBusy] = useState(false)
  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: api.templates, enabled: open })
  const templates = templatesQ.data ?? ['classic']

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
