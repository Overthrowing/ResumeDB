import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Entry } from '@/lib/api'
import MarkdownField from '@/components/MarkdownField'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TITLE_LABEL: Record<string, string> = {
  experience: 'Role',
  project: 'Project name',
  skill: 'Category',
  course: 'Course',
  education: 'School',
  achievement: 'Achievement',
  extra: 'Title',
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

function TagEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="mt-3">
      <Label className="mb-1.5 text-xs text-foreground/70">{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1.5">
            {t}
            <button className="inline-flex cursor-pointer opacity-50 hover:opacity-100" onClick={() => onChange(values.filter((x) => x !== t))}>
              <X className="size-2.5" />
            </button>
          </Badge>
        ))}
        <Input
          className="h-7 w-32 text-xs"
          placeholder="+ add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          onBlur={add}
        />
      </div>
    </div>
  )
}

export default function EntryForm({
  type,
  entry,
  onDone,
  onCancel,
}: {
  type: Entry['type']
  entry?: Entry
  onDone: () => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Entry>(
    entry ?? { id: '', type, title: '', bullets: [], tags: [], items: [], notes: '' },
  )
  const set = (patch: Partial<Entry>) => setDraft({ ...draft, ...patch })

  const save = async () => {
    const id = draft.id || slugify(draft.title)
    if (!id) {
      toast.error('Give it a title first.')
      return
    }
    try {
      const { id: _drop, ...body } = { ...draft, type }
      await api.saveEntry(id, body)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const del = async () => {
    if (!entry) return
    if (!confirm(`Delete "${entry.title}" from the library?`)) return
    try {
      await api.deleteEntry(entry.id)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const isSkill = type === 'skill'
  const bullets = draft.bullets ?? []

  return (
    <div className="mb-3 rounded-lg border border-primary/30 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Badge>{entry ? 'Editing' : 'New entry'}</Badge>
        <span className="text-xs text-muted-foreground">Changes save to the Library</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 text-xs">{TITLE_LABEL[type]}</Label>
          <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
        {!isSkill && (
          <div>
            <Label className="mb-1.5 text-xs">Organization</Label>
            <Input value={draft.org ?? ''} onChange={(e) => set({ org: e.target.value })} />
          </div>
        )}
        {!isSkill && (
          <div>
            <Label className="mb-1.5 text-xs">Location</Label>
            <Input value={draft.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
          </div>
        )}
        {!isSkill && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1.5 text-xs">Start</Label>
              <Input placeholder="2023-06" value={draft.start ?? ''} onChange={(e) => set({ start: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 text-xs">End</Label>
              <Input placeholder="present" value={draft.end ?? ''} onChange={(e) => set({ end: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {isSkill ? (
        <TagEditor label="Skills in this category" values={draft.items ?? []} onChange={(items) => set({ items })} />
      ) : (
        <div className="mt-3">
          <Label className="mb-1.5 text-xs text-foreground/70">Achievements</Label>
          <div className="flex flex-col gap-2">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2 text-primary">-</span>
                <Input value={b} onChange={(e) => set({ bullets: bullets.map((x, j) => (j === i ? e.target.value : x)) })} />
                <Button variant="ghost" size="icon-sm" className="mt-0.5" onClick={() => set({ bullets: bullets.filter((_, j) => j !== i) })}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="self-start text-[13px]" onClick={() => set({ bullets: [...bullets, ''] })}>
              <Plus className="size-3.5" />
              Add achievement
            </Button>
          </div>
        </div>
      )}

      {!isSkill && <TagEditor label="Skills & tags" values={draft.tags ?? []} onChange={(tags) => set({ tags })} />}

      <div className="mt-3">
        <Label className="mb-1.5 text-xs">
          Details <span className="font-normal normal-case text-muted-foreground">- full context the agent draws from (unlimited)</span>
        </Label>
        <MarkdownField
          value={draft.notes ?? ''}
          minHeight={80}
          placeholder="Unlimited context in markdown - stack, scope, war stories…"
          onChange={(notes) => set({ notes })}
        />
      </div>

      <div className="mt-4 flex gap-2">
        {entry && (
          <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={del}>
            Delete
          </Button>
        )}
        <Button variant="secondary" className={entry ? undefined : 'ml-auto'} onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={save}>
          <Check className="size-4" />
          Save entry
        </Button>
      </div>
    </div>
  )
}
