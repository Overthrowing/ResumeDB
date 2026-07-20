import type { AgentRunEvent, ResearchRun } from './api'
import { IconCheck, IconWarn } from './icons'

const PLACEHOLDER_EVENTS: AgentRunEvent[] = [
  {
    id: 'knowledge',
    label: 'Read the complete career knowledge base',
    detail: 'Profile, experience, preferences, and agent memory',
    status: 'pending',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'research',
    label: 'Research and inspect live roles',
    detail: 'Official postings, requirements, and application links',
    status: 'pending',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'qualification',
    label: 'Score fit and verify factual support',
    detail: 'Evidence, missing facts, and hard conflicts',
    status: 'pending',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'preparation',
    label: 'Prepare the strongest matches',
    detail: 'Tailored resume, answers, and human-review blockers',
    status: 'pending',
    created_at: '',
    updated_at: '',
  },
]

export default function AgentTimeline({ run }: { run: ResearchRun | null }) {
  const actual = new Map((run?.events ?? []).map((event) => [event.id, event]))
  const events = PLACEHOLDER_EVENTS.map((event) => actual.get(event.id) ?? event)
  const extras = (run?.events ?? []).filter((event) => !PLACEHOLDER_EVENTS.some((item) => item.id === event.id))
  const visibleEvents = [...events, ...extras]
  const running = run?.status === 'running' || run?.status === 'pending'

  return (
    <section className="agent-timeline" data-tour="agent-timeline" aria-live="polite">
      <div className="agent-timeline-head">
        <div>
          <div className="card-kicker">Agent run timeline</div>
          <h3>{run ? run.query : 'What the agent will do'}</h3>
        </div>
        <span className={`agent-run-state state-${run?.status ?? 'idle'}`}>
          {running && <span className="agent-pulse" />}
          {run?.status ?? 'idle'}
        </span>
      </div>

      <div className="agent-event-list">
        {visibleEvents.map((event, index) => (
          <div className={`agent-event event-${event.status}`} key={event.id}>
            <div className="agent-event-rail">
              <span className="agent-event-dot">
                {event.status === 'completed' && <IconCheck size={11} />}
                {event.status === 'failed' && <IconWarn size={11} />}
              </span>
              {index < visibleEvents.length - 1 && <span className="agent-event-line" />}
            </div>
            <div className="agent-event-copy">
              <strong>{event.label}</strong>
              <span>{event.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {run?.status === 'completed' && run.summary && <div className="agent-timeline-result">{run.summary}</div>}
      {run?.status === 'failed' && <div className="agent-timeline-error">{run.error || run.summary}</div>}
    </section>
  )
}
