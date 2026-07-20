import { useEffect, useMemo, useRef, useState } from 'react'

export type DemoDestination = {
  screen: 'dashboard' | 'agent' | 'applications'
  view?: 'comparison' | 'autofill'
}

type DemoStep = DemoDestination & {
  target: string
  eyebrow: string
  title: string
  body: string
}

type TourPhase = 'navigation' | 'content'

const NAVIGATION_CLICK_MS = 2200
const NAV_LABELS: Record<DemoDestination['screen'], string> = {
  dashboard: 'Home',
  agent: 'Career Agent',
  applications: 'Applications',
}

const STEPS: DemoStep[] = [
  {
    screen: 'dashboard',
    target: '[data-tour="demo-launch"]',
    eyebrow: 'The complete loop',
    title: 'One agent, from intent to application',
    body: 'ResumeDB connects the student profile, job search, tailored artifacts, and browser autofill in one reviewable workflow.',
  },
  {
    screen: 'agent',
    target: '[data-tour="agent-command"]',
    eyebrow: 'Natural-language control',
    title: 'Give the agent a goal or any job URL',
    body: 'The user describes the outcome. The agent decides whether to discover roles, capture a posting, qualify it, or prepare an application.',
  },
  {
    screen: 'agent',
    target: '[data-tour="agent-timeline"]',
    eyebrow: 'Observable autonomy',
    title: 'Watch the agent reason through the work',
    body: 'Every run exposes its current phase, completed work, evidence checks, and preparation decisions instead of hiding behind a spinner.',
  },
  {
    screen: 'applications',
    view: 'comparison',
    target: '[data-tour="tailoring-comparison"]',
    eyebrow: 'Evidence-backed tailoring',
    title: 'See exactly what changed and why',
    body: 'Each rewrite links the original bullet, the job requirement, the final language, and the canonical evidence that supports the claim.',
  },
  {
    screen: 'applications',
    view: 'autofill',
    target: '[data-tour="extension-preflight"]',
    eyebrow: 'Human-controlled execution',
    title: 'Preview mappings before the extension fills',
    body: 'ResumeDB shows what is ready, what needs review, and whether the tailored PDF is available. The user still performs the final submission.',
  },
]

type FocusRect = { top: number; left: number; right: number; bottom: number; width: number; height: number }

export default function GuidedDemo({
  onNavigate,
  onClose,
}: {
  onNavigate: (destination: DemoDestination) => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [focus, setFocus] = useState<FocusRect | null>(null)
  const [cursorClick, setCursorClick] = useState(false)
  const [phase, setPhase] = useState<TourPhase>('content')
  const currentScreen = useRef<DemoDestination['screen']>('dashboard')
  const step = STEPS[index]
  const targetSelector = phase === 'navigation' ? `[data-tour-nav="${step.screen}"]` : step.target

  useEffect(() => {
    const destination = { screen: step.screen, view: step.view }
    if (currentScreen.current === step.screen) {
      setPhase('content')
      onNavigate(destination)
      return
    }

    setPhase('navigation')
    const timer = window.setTimeout(() => {
      currentScreen.current = step.screen
      onNavigate(destination)
      setPhase('content')
    }, NAVIGATION_CLICK_MS)
    return () => window.clearTimeout(timer)
  }, [index, onNavigate, step.screen, step.view])

  useEffect(() => {
    let stopped = false
    let didScroll = false
    const measure = () => {
      if (stopped) return
      const target = document.querySelector<HTMLElement>(targetSelector)
      if (!target) {
        setFocus(null)
        return
      }
      if (!didScroll) {
        didScroll = true
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
      const rect = target.getBoundingClientRect()
      const next = {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }
      setFocus((current) => {
        if (
          current
          && Math.abs(current.top - next.top) < 0.5
          && Math.abs(current.left - next.left) < 0.5
          && Math.abs(current.width - next.width) < 0.5
          && Math.abs(current.height - next.height) < 0.5
        ) return current
        return next
      })
    }
    const timer = window.setInterval(measure, 160)
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    window.addEventListener('resize', measure)
    measure()
    return () => {
      stopped = true
      window.clearInterval(timer)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [targetSelector])

  useEffect(() => {
    setCursorClick(false)
    if (!focus) return
    const timer = window.setTimeout(() => setCursorClick(true), 720)
    return () => window.clearTimeout(timer)
  }, [index, phase, focus])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const padded = useMemo(() => {
    if (!focus) return null
    const pad = 10
    return {
      top: Math.max(8, focus.top - pad),
      left: Math.max(8, focus.left - pad),
      right: Math.min(window.innerWidth - 8, focus.right + pad),
      bottom: Math.min(window.innerHeight - 8, focus.bottom + pad),
    }
  }, [focus])

  const coachPosition = useMemo(() => {
    const width = Math.min(360, window.innerWidth - 32)
    if (!padded) return { width, left: (window.innerWidth - width) / 2, top: window.innerHeight / 2 - 130 }
    const rightSpace = window.innerWidth - padded.right
    const left = rightSpace >= width + 32
      ? padded.right + 22
      : padded.left >= width + 32
        ? padded.left - width - 22
        : Math.max(16, Math.min(window.innerWidth - width - 16, padded.left))
    const below = padded.bottom + 18
    const top = below + 250 < window.innerHeight
      ? below
      : Math.max(16, Math.min(window.innerHeight - 260, padded.top - 244))
    return { width, left, top }
  }, [padded])

  const cursor = padded
    ? { left: padded.left + Math.min(Math.max(32, (padded.right - padded.left) * 0.7), padded.right - padded.left - 20), top: padded.top + Math.min(42, padded.bottom - padded.top - 16) }
    : { left: window.innerWidth / 2, top: window.innerHeight / 2 }

  const coachCopy = phase === 'navigation'
    ? {
        eyebrow: 'Find it in the sidebar',
        title: `Open ${NAV_LABELS[step.screen]}`,
        body: `${NAV_LABELS[step.screen]} is always available in the main navigation. The demo will click it, then show what to do on that page.`,
      }
    : step

  const previous = () => {
    setIndex((value) => Math.max(0, value - 1))
  }
  const next = () => {
    if (index === STEPS.length - 1) onClose()
    else setIndex((value) => value + 1)
  }

  return (
    <div className="guided-demo" role="dialog" aria-modal="true" aria-label="ResumeDB guided demo">
      {padded ? (
        <>
          <div className="tour-shade tour-shade-top" style={{ height: padded.top }} />
          <div className="tour-shade" style={{ top: padded.top, left: 0, width: padded.left, height: padded.bottom - padded.top }} />
          <div className="tour-shade" style={{ top: padded.top, left: padded.right, right: 0, height: padded.bottom - padded.top }} />
          <div className="tour-shade" style={{ top: padded.bottom, right: 0, bottom: 0, left: 0 }} />
          <div className="tour-focus-ring" style={{ top: padded.top, left: padded.left, width: padded.right - padded.left, height: padded.bottom - padded.top }} />
        </>
      ) : <div className="tour-shade tour-shade-full" />}

      <div className={`tour-cursor${cursorClick ? ' is-clicking' : ''}`} style={cursor} aria-hidden="true">
        <svg viewBox="0 0 28 34"><path d="M2 2 24 19l-10 2-5 10L2 2Z" /></svg>
        <span />
      </div>

      <section className="tour-coach" style={coachPosition}>
        <div className="tour-coach-topline">
          <span>{coachCopy.eyebrow}</span>
          <button type="button" onClick={onClose} aria-label="Close guided demo">×</button>
        </div>
        <h2>{coachCopy.title}</h2>
        <p>{coachCopy.body}</p>
        <div className="tour-progress" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((item, itemIndex) => <span className={itemIndex <= index ? 'active' : ''} key={item.title} />)}
        </div>
        <div className="tour-actions">
          <button className="btn btn-ghost" type="button" disabled={index === 0} onClick={previous}>← Back</button>
          <button className="btn btn-primary" type="button" onClick={next}>
            {index === STEPS.length - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      </section>
    </div>
  )
}
