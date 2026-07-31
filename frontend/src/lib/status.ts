// The single source of truth for application statuses. Mirrors
// DataRepo.APP_STATUSES in backend/resumedb/datarepo.py.

export type Phase = 'pre' | 'submitted' | 'terminal'

export interface StatusMeta {
  id: string
  label: string
  phase: Phase
  /** Tailwind classes for the pill. */
  pill: string
  /** Fill for the Sankey node and pipeline dot. */
  color: string
}

export const STATUSES: StatusMeta[] = [
  { id: 'not_started', label: 'Not started', phase: 'pre', pill: 'bg-muted text-muted-foreground', color: 'var(--muted-foreground)' },
  { id: 'in_progress', label: 'In progress', phase: 'pre', pill: 'bg-sky-100 text-sky-800', color: '#38bdf8' },
  { id: 'awaiting_review', label: 'Awaiting review', phase: 'pre', pill: 'bg-amber-100 text-amber-800', color: '#fbbf24' },
  { id: 'ready', label: 'Ready', phase: 'pre', pill: 'bg-emerald-100 text-emerald-800', color: '#34d399' },
  { id: 'applied', label: 'Applied', phase: 'submitted', pill: 'bg-accent text-accent-foreground', color: 'var(--primary)' },
  { id: 'screen', label: 'Screen / OA', phase: 'submitted', pill: 'bg-violet-100 text-violet-800', color: '#a78bfa' },
  { id: 'interview', label: 'Interview', phase: 'submitted', pill: 'bg-indigo-100 text-indigo-800', color: '#818cf8' },
  { id: 'offer', label: 'Offer', phase: 'submitted', pill: 'bg-teal-100 text-teal-800', color: '#2dd4bf' },
  { id: 'accepted', label: 'Accepted', phase: 'terminal', pill: 'bg-emerald-600 text-white', color: '#059669' },
  { id: 'rejected', label: 'Rejected', phase: 'terminal', pill: 'bg-red-100 text-red-800', color: '#f87171' },
  { id: 'ghosted', label: 'Ghosted', phase: 'terminal', pill: 'bg-stone-200 text-stone-700', color: '#a8a29e' },
  { id: 'withdrawn', label: 'Withdrawn', phase: 'terminal', pill: 'bg-stone-200 text-stone-700', color: '#78716c' },
]

const BY_ID = new Map(STATUSES.map((s) => [s.id, s]))

const FALLBACK: StatusMeta = STATUSES[0]

export function statusMeta(id: string | undefined): StatusMeta {
  return (id && BY_ID.get(id)) || FALLBACK
}

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'pre', label: 'Before applying' },
  { id: 'submitted', label: 'In the pipeline' },
  { id: 'terminal', label: 'Closed' },
]

export const byPhase = (phase: Phase) => STATUSES.filter((s) => s.phase === phase)

/** Ordering used by the pipeline strip and the Sankey column layout. */
export const STATUS_ORDER = STATUSES.map((s) => s.id)

export const isTerminal = (id: string | undefined) => statusMeta(id).phase === 'terminal'
