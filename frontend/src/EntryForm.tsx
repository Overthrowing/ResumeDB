import { useState } from 'react'
import { api, type Entry } from './api'
import MarkdownField from './MarkdownField'
import { IconCheck, IconPlus, IconX } from './icons'

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
    <div style={{ marginTop: 'var(--space-3)' }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'color-mix(in srgb,var(--color-text) 70%,transparent)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
        {values.map((t) => (
          <span key={t} className="tag tag-neutral" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {t}
            <span style={{ opacity: 0.5, cursor: 'pointer', display: 'inline-flex' }} onClick={() => onChange(values.filter((x) => x !== t))}>
              <IconX size={11} />
            </span>
          </span>
        ))}
        <input
          className="input"
          style={{ width: 130, minHeight: 26, padding: '2px 8px', fontSize: 12 }}
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
  const [error, setError] = useState('')
  const set = (patch: Partial<Entry>) => setDraft({ ...draft, ...patch })

  const save = async () => {
    const id = draft.id || slugify(draft.title)
    if (!id) {
      setError('Give it a title first.')
      return
    }
    try {
      const { id: _drop, ...body } = { ...draft, type }
      await api.saveEntry(id, body)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const del = async () => {
    if (!entry) return
    if (!confirm(`Delete "${entry.title}" from the library?`)) return
    try {
      await api.deleteEntry(entry.id)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const isSkill = type === 'skill'
  const bullets = draft.bullets ?? []

  return (
    <div style={{ border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-md)', background: 'var(--color-neutral-100)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
        <span className="tag tag-accent">{entry ? 'Editing' : 'New entry'}</span>
        <span className="text-muted" style={{ fontSize: 12 }}>
          Changes save to the Library
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div className="field">
          <label>{TITLE_LABEL[type]}</label>
          <input className="input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
        {!isSkill && (
          <div className="field">
            <label>Organization</label>
            <input className="input" value={draft.org ?? ''} onChange={(e) => set({ org: e.target.value })} />
          </div>
        )}
        {!isSkill && (
          <div className="field">
            <label>Location</label>
            <input className="input" value={draft.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
          </div>
        )}
        {!isSkill && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <div className="field">
              <label>Start</label>
              <input className="input" placeholder="2023-06" value={draft.start ?? ''} onChange={(e) => set({ start: e.target.value })} />
            </div>
            <div className="field">
              <label>End</label>
              <input className="input" placeholder="present" value={draft.end ?? ''} onChange={(e) => set({ end: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {isSkill ? (
        <TagEditor label="Skills in this category" values={draft.items ?? []} onChange={(items) => set({ items })} />
      ) : (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb,var(--color-text) 70%,transparent)' }}>
            Achievements
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-accent)', marginTop: 9 }}>-</span>
                <input
                  className="input"
                  value={b}
                  onChange={(e) => set({ bullets: bullets.map((x, j) => (j === i ? e.target.value : x)) })}
                />
                <button className="btn btn-ghost" style={{ padding: '8px 6px' }} onClick={() => set({ bullets: bullets.filter((_, j) => j !== i) })}>
                  <IconX size={13} />
                </button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={() => set({ bullets: [...bullets, ''] })}>
              <IconPlus size={14} />
              Add achievement
            </button>
          </div>
        </div>
      )}

      {!isSkill && <TagEditor label="Skills & tags" values={draft.tags ?? []} onChange={(tags) => set({ tags })} />}

      <div className="field" style={{ marginTop: 'var(--space-3)' }}>
        <label>
          Details{' '}
          <span className="text-muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
            - full context the agent draws from (unlimited)
          </span>
        </label>
        <MarkdownField
          value={draft.notes ?? ''}
          minHeight={80}
          placeholder="Unlimited context in markdown - stack, scope, war stories…"
          onChange={(notes) => set({ notes })}
        />
      </div>

      {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13, marginTop: 'var(--space-2)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        {entry && (
          <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={del}>
            Delete
          </button>
        )}
        <button className="btn btn-secondary" style={{ marginLeft: entry ? undefined : 'auto' }} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save}>
          <IconCheck size={15} />
          Save entry
        </button>
      </div>
    </div>
  )
}
