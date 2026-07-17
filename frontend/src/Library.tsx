import { useEffect, useMemo, useState } from 'react'
import { api, type Entry } from './api'
import ChatRail from './ChatRail'
import EntryForm from './EntryForm'
import MarkdownField from './MarkdownField'
import { IconChevronDown, IconMemory, IconPlus } from './icons'

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
  return [prettyDate(e.start), prettyDate(e.end)]
    .filter(Boolean)
    .join(' - ')
    .replace(/ /g, ' ')
}

export default function Library() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [section, setSection] = useState<SectionId>('experience')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [error, setError] = useState('')

  const reload = () => api.entries().then(setEntries).catch((e) => setError(e.message))
  useEffect(() => {
    reload()
  }, [])

  const bySection = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const e of entries) {
      m.set(e.type, [...(m.get(e.type) ?? []), e])
    }
    return m
  }, [entries])

  const current = section === 'memory' ? [] : (bySection.get(section) ?? [])
  const sectionMeta = SECTIONS.find((s) => s.id === section)

  const onSaved = () => {
    setEditing(null)
    reload()
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* section nav */}
      <div style={{ width: 196, flex: 'none', borderRight: '1px solid var(--color-divider)', padding: 'var(--space-4) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', padding: '0 10px var(--space-2)', fontFamily: 'var(--font-heading)' }}>
          Library
        </div>
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            className={`sec-item${section === s.id ? ' active' : ''}`}
            onClick={() => {
              setSection(s.id)
              setEditing(null)
            }}
          >
            {s.label}
            <span style={{ color: 'var(--color-neutral-500)', fontSize: 12 }}>{bySection.get(s.id)?.length ?? 0}</span>
          </div>
        ))}
        <div style={{ height: 1, background: 'var(--color-divider)', margin: 'var(--space-2) 10px' }} />
        <div
          className={`sec-item${section === 'memory' ? ' active' : ''}`}
          style={{ justifyContent: 'flex-start', gap: 8 }}
          onClick={() => setSection('memory')}
        >
          <IconMemory size={15} />
          Memory
        </div>
      </div>

      {/* center */}
      <div className="rs-scroll" style={{ flex: 1, minWidth: 0, padding: 'var(--space-6) var(--space-8)' }}>
        {error && (
          <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{error}</div>
        )}

        {section === 'memory' ? (
          <MemoryDoc />
        ) : (
          <>
            <div className="section-head">
              <div>
                <h2 style={{ margin: 0 }}>{sectionMeta?.label}</h2>
                <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
                  {current.length} {current.length === 1 ? sectionMeta?.plural.replace(/ies$/, 'y').replace(/s$/, '') : sectionMeta?.plural}
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setEditing('new')}>
                <IconPlus size={15} />
                Add {section}
              </button>
            </div>

            {editing === 'new' && (
              <EntryForm type={section} onDone={onSaved} onCancel={() => setEditing(null)} />
            )}

            {current.map((e) =>
              editing === e.id ? (
                <EntryForm key={e.id} type={section} entry={e} onDone={onSaved} onCancel={() => setEditing(null)} />
              ) : (
                <div key={e.id} className="entry-row" onClick={() => setEditing(e.id)}>
                  <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>
                      {e.title}
                      {e.org ? ` · ${e.org}` : ''}
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {[e.location, dates(e), e.bullets?.length ? `${e.bullets.length} achievements` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(e.type === 'skill' ? (e.items ?? []) : (e.tags ?? [])).slice(0, 3).map((t) => (
                      <span key={t} className="tag tag-neutral">
                        {t}
                      </span>
                    ))}
                    {(e.type === 'skill' ? (e.items ?? []) : (e.tags ?? [])).length > 3 && (
                      <span className="tag tag-neutral">+{(e.type === 'skill' ? e.items! : e.tags!).length - 3}</span>
                    )}
                  </div>
                  <span style={{ color: 'var(--color-neutral-500)' }}>
                    <IconChevronDown size={16} />
                  </span>
                </div>
              ),
            )}
            {current.length === 0 && editing !== 'new' && (
              <div className="text-muted" style={{ fontSize: 14 }}>
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
        onTurnDone={reload}
      />
    </div>
  )
}

function MemoryDoc() {
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .memory()
      .then((m) => {
        setContent(m.content)
        setLoaded(true)
      })
      .catch((e) => setError(e.message))
  }, [])

  const save = async () => {
    try {
      await api.saveMemory(content)
      setDirty(false)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div>
          <h2 style={{ margin: 0 }}>Memory</h2>
          <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0', maxWidth: '52ch' }}>
            Standing context every application inherits - read by each tailoring session. Plain markdown,
            structured however you like.
          </p>
        </div>
        <span className="tag tag-outline" style={{ flex: 'none' }}>
          Shared context
        </span>
      </div>
      <hr className="hr" />
      {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginBottom: 'var(--space-3)' }}>{error}</div>}
      {loaded && (
        <MarkdownField
          value={content}
          minHeight={420}
          style={{ flex: 1 }}
          placeholder="Standing context in markdown - constraints, voice, emphasis…"
          onChange={(v) => {
            setContent(v)
            setDirty(true)
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
        <button className="btn btn-primary" disabled={!dirty} onClick={save}>
          Save memory
        </button>
      </div>
    </div>
  )
}
