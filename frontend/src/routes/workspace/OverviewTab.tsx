import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Application, type AppStatus } from '@/lib/api'
import MarkdownField from '@/components/MarkdownField'
import StatusPipeline from '@/routes/workspace/StatusPipeline'
import { Button } from '@/components/ui/button'
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
import { PHASES, byPhase, isTerminal, statusMeta } from '@/lib/status'

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

export default function OverviewTab({ app, onSaved }: { app: Application; onSaved: () => void }) {
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
  const next = NEXT_ACTIONS[fields.status]

  return (
    <div className="max-w-2xl">
      <StatusPipeline status={fields.status} />

      {next && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/50 bg-accent/60 p-3">
          <div className="min-w-48 flex-1 text-[13px]">
            <strong className="text-accent-foreground">{next.title}</strong>
            <div className="text-xs text-muted-foreground">{next.hint}</div>
          </div>
          {next.actions.map((a) => (
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
