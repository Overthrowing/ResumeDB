import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Entry } from '@/lib/api'
import ChatRail from '@/components/ChatRail'
import EntryForm from '@/components/EntryForm'
import MarkdownField from '@/components/MarkdownField'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'experience', label: 'Experiences', plural: 'experiences' },
  { id: 'project', label: 'Projects', plural: 'projects' },
  { id: 'skill', label: 'Skills', plural: 'skill categories' },
  { id: 'education', label: 'Education', plural: 'entries' },
  { id: 'course', label: 'Courses', plural: 'courses' },
  { id: 'achievement', label: 'Achievements', plural: 'achievements' },
  { id: 'extra', label: 'Extras', plural: 'entries' },
] as const

type SectionId = (typeof SECTIONS)[number]['id'] | 'memory'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function prettyDate(d?: string) {
  if (!d) return ''
  const m = /^(\d{4})-(\d{2})$/.exec(d)
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`
  return d === 'present' ? 'Present' : d
}
function dates(e: Entry) {
  if (!e.start && !e.end) return ''
  return [prettyDate(e.start), prettyDate(e.end)].filter(Boolean).join(' - ')
}

export default function Library() {
  const qc = useQueryClient()
  const [section, setSection] = useState<SectionId>('experience')
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  const entriesQ = useQuery({ queryKey: ['entries'], queryFn: api.entries })
  const entries = entriesQ.data ?? []

  const bySection = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const e of entries) m.set(e.type, [...(m.get(e.type) ?? []), e])
    return m
  }, [entries])

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['entries'] })
    qc.invalidateQueries({ queryKey: ['profile'] })
  }
  const onSaved = () => {
    setEditing(null)
    reload()
  }

  const current = section === 'memory' ? [] : (bySection.get(section) ?? [])
  const sectionMeta = SECTIONS.find((s) => s.id === section)

  return (
    <div className="flex min-h-0 flex-1">
      {/* section nav */}
      <div className="flex w-48 flex-none flex-col gap-px border-r px-3 py-4">
        <div className="px-2.5 pb-2 font-heading text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Library
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={cn(
              'flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent/60',
              section === s.id && 'bg-accent font-medium text-accent-foreground',
            )}
            onClick={() => {
              setSection(s.id)
              setEditing(null)
            }}
          >
            {s.label}
            <span className="text-xs text-muted-foreground">{bySection.get(s.id)?.length ?? 0}</span>
          </button>
        ))}
        <div className="mx-2.5 my-2 h-px bg-border" />
        <button
          className={cn(
            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent/60',
            section === 'memory' && 'bg-accent font-medium text-accent-foreground',
          )}
          onClick={() => setSection('memory')}
        >
          <BookText className="size-3.5" />
          Memory
        </button>
      </div>

      {/* center */}
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        {entriesQ.isError && (
          <div className="mb-3 text-[13px] text-destructive">{(entriesQ.error as Error).message}</div>
        )}

        {section === 'memory' ? (
          <MemoryDoc />
        ) : (
          <>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="font-heading text-[26px] font-semibold leading-tight">{sectionMeta?.label}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {current.length}{' '}
                  {current.length === 1
                    ? sectionMeta?.plural.replace(/ies$/, 'y').replace(/s$/, '')
                    : sectionMeta?.plural}
                </p>
              </div>
              <Button onClick={() => setEditing('new')}>
                <Plus className="size-4" />
                Add {section}
              </Button>
            </div>

            {editing === 'new' && <EntryForm type={section} onDone={onSaved} onCancel={() => setEditing(null)} />}

            {current.map((e) =>
              editing === e.id ? (
                <EntryForm key={e.id} type={section} entry={e} onDone={onSaved} onCancel={() => setEditing(null)} />
              ) : (
                <button
                  key={e.id}
                  className="mb-2 flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditing(e.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-base font-semibold">
                      {e.title}
                      {e.org ? ` · ${e.org}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[e.location, dates(e), e.bullets?.length ? `${e.bullets.length} achievements` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <div className="flex flex-none gap-1.5">
                    {(e.type === 'skill' ? (e.items ?? []) : (e.tags ?? [])).slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[11px]">
                        {t}
                      </Badge>
                    ))}
                    {(e.type === 'skill' ? (e.items ?? []) : (e.tags ?? [])).length > 3 && (
                      <Badge variant="secondary" className="text-[11px]">
                        +{(e.type === 'skill' ? e.items! : e.tags!).length - 3}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="size-4 flex-none text-muted-foreground" />
                </button>
              ),
            )}
            {current.length === 0 && editing !== 'new' && !entriesQ.isPending && (
              <div className="text-sm text-muted-foreground">
                Nothing here yet. Add entries by hand, or let the intake chat interview you.
              </div>
            )}
          </>
        )}
      </div>

      <ChatRail
        scope="db"
        title="Library assistant"
        subtitle="Builds & cleans your database"
        placeholder="Paste anything you've done, or ask me to clean up an entry…"
        onDone={reload}
      />
    </div>
  )
}

function MemoryDoc() {
  const qc = useQueryClient()
  const memQ = useQuery({ queryKey: ['memory'], queryFn: api.memory })
  const [content, setContent] = useState<string | null>(null)
  const value = content ?? memQ.data?.content ?? ''
  const dirty = content !== null && content !== memQ.data?.content

  const save = async () => {
    try {
      await api.saveMemory(value)
      qc.invalidateQueries({ queryKey: ['memory'] })
      setContent(null)
      toast.success('Memory saved')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <h2 className="font-heading text-[26px] font-semibold leading-tight">Memory</h2>
          <p className="mt-0.5 max-w-[52ch] text-[13px] text-muted-foreground">
            Standing context every application inherits - read by each tailoring session. Plain markdown, structured
            however you like.
          </p>
        </div>
        <Badge variant="outline" className="flex-none">
          Shared context
        </Badge>
      </div>
      <div className="mb-4 h-px bg-border" />
      {memQ.isError && <div className="mb-3 text-[13px] text-destructive">{(memQ.error as Error).message}</div>}
      {memQ.isSuccess && (
        <MarkdownField
          value={value}
          minHeight={420}
          className="flex-1"
          placeholder="Standing context in markdown - constraints, voice, emphasis…"
          onChange={setContent}
        />
      )}
      <div className="mt-3 flex justify-end">
        <Button disabled={!dirty} onClick={save}>
          Save memory
        </Button>
      </div>
    </div>
  )
}
