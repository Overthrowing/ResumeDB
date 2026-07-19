import { useEffect, useState } from 'react'
import { api, type Health, type ModelConfig, type Profile } from './api'
import {
  DEMO_COMPANY,
  DEMO_DECISIONS,
  DEMO_JOB_DESCRIPTION,
  DEMO_ROLE,
  makeDemoAnswers,
  makeDemoCoverLetter,
  makeDemoEntries,
  makeDemoProfile,
  makeDemoResume,
} from './demoData'

const CLAUDE_MODEL_OPTIONS = ['', 'haiku', 'sonnet', 'opus', 'fable']
const CODEX_MODEL_OPTIONS = ['', 'gpt-5.3-codex-spark', 'gpt-5.6-sol']
const EFFORT_OPTIONS = ['', 'low', 'medium', 'high', 'xhigh', 'max']

const MODEL_ROWS: { label: string; hint: string; model: keyof ModelConfig; effort: keyof ModelConfig }[] = [
  { label: 'Chat agents', hint: 'intake, applications', model: 'chat', effort: 'chat_effort' },
  { label: 'Tailoring', hint: 'resume optimization - thinks by default', model: 'tailor', effort: 'tailor_effort' },
  { label: 'ATS audit rubric', hint: 'keyword scoring', model: 'audit', effort: 'audit_effort' },
  { label: 'Job-posting fetch', hint: 'jd-from-link', model: 'jd', effort: 'jd_effort' },
]

const ANSWER_FIELDS = [
  ['age_18_or_older', 'Are you 18 or older?'],
  ['gender', 'Gender identity'],
  ['race_ethnicity', 'Race or ethnicity'],
  ['veteran_status', 'Veteran status'],
  ['disability_status', 'Disability status'],
] as const

export default function Settings({
  health,
  onProfileChange,
}: {
  health: Health | null
  onProfileChange: (p: Profile) => void
}) {
  const [profile, setProfile] = useState<Profile>({})
  const [links, setLinks] = useState('')
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoStatus, setDemoStatus] = useState('')

  useEffect(() => {
    api
      .profile()
      .then((p) => {
        setProfile(p)
        setLinks((p.links ?? []).map((l) => `${l.label}: ${l.url}`).join('\n'))
      })
      .catch((e) => setError(e.message))
  }, [])

  const save = async () => {
    const parsedLinks = links
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const bare = /^(https?:\/\/\S+)$/.exec(line)
        if (bare) {
          const url = bare[1]
          const host = url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0]
          return { label: host, url }
        }
        const idx = line.indexOf(': ')
        return idx > 0
          ? { label: line.slice(0, idx).trim(), url: line.slice(idx + 2).trim() }
          : { label: line, url: line }
      })
    const p = { ...profile, links: parsedLinks }
    try {
      await api.saveProfile(p)
      onProfileChange(p)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const set = (patch: Partial<Profile>) => {
    setProfile({ ...profile, ...patch })
    setDirty(true)
  }

  const setAnswer = (key: string, value: string) => {
    set({ application_answers: { ...(profile.application_answers ?? {}), [key]: value } })
  }

  const demoUrl = () => {
    const url = new URL(window.location.href)
    url.search = '?demo=ats'
    url.hash = ''
    return url.toString()
  }

  const showDemoProfile = async () => {
    setDemoBusy(true)
    try {
      const next = await makeDemoProfile()
      setProfile(next)
      setLinks((next.links ?? []).map((link) => `${link.label}: ${link.url}`).join('\n'))
      setDirty(true)
      setSaved(false)
      setError('')
      setDemoStatus('Synthetic profile loaded. Review it, then save when you are ready.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDemoBusy(false)
    }
  }

  const openDemoForm = () => {
    window.open(demoUrl(), '_blank', 'noopener,noreferrer')
  }

  const createReadyDemo = async () => {
    const confirmed = window.confirm(
      'This will save a synthetic profile and three clearly labeled demo knowledge entries in your current career repository. Continue?',
    )
    if (!confirmed) return

    setDemoBusy(true)
    setError('')
    setDemoStatus('Generating a synthetic student profile...')
    try {
      const next = await makeDemoProfile()
      const source = demoUrl()
      await api.saveProfile(next)

      setDemoStatus('Adding synthetic education, experience, and project evidence...')
      for (const item of makeDemoEntries(next)) {
        const { id, ...entry } = item
        await api.saveEntry(id, entry)
      }

      setDemoStatus('Building a tailored Northstar Robotics application...')
      const existing = (await api.applications()).find(
        (application) => application.source === source && application.status !== 'submitted',
      )
      const appId = existing
        ? existing.id
        : (
            await api.createApplication({
              company: DEMO_COMPANY,
              role: DEMO_ROLE,
              jd_text: DEMO_JOB_DESCRIPTION,
              jd_url: source,
            })
          ).id

      await api.saveAppFile(appId, 'jd.md', DEMO_JOB_DESCRIPTION)
      await api.saveAppFile(appId, 'resume.yaml', makeDemoResume(next))
      await api.saveAppFile(appId, 'answers.yaml', makeDemoAnswers(next))
      await api.saveAppFile(appId, 'cover-letter.md', makeDemoCoverLetter(next))
      await api.saveAppFile(appId, 'decisions.md', DEMO_DECISIONS)
      await api.saveAppMeta(appId, {
        status: 'draft',
        source,
        fit_score: 96,
        fit_summary: 'Strong match across React, TypeScript, Python, APIs, PostgreSQL, Git, testing, and collaborative product work.',
      })

      setDemoStatus('Rendering the tailored PDF and approving the application...')
      const rendered = await api.render(appId)
      if (!rendered.ok) throw new Error(rendered.stderr || 'The demo resume could not be rendered.')
      const readiness = await api.approve(appId)
      if (!readiness.ready || readiness.status !== 'ready') throw new Error('The demo application did not reach Ready status.')

      setProfile(next)
      setLinks((next.links ?? []).map((link) => `${link.label}: ${link.url}`).join('\n'))
      setDirty(false)
      onProfileChange(next)
      sessionStorage.setItem('resumedb.demoApplicationId', appId)
      setDemoStatus('Ready. Opening the test application form...')
      window.location.assign(source)
    } catch (e) {
      setError((e as Error).message)
      setDemoStatus('Demo setup stopped before opening the test form.')
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <div className="rs-scroll" style={{ flex: 1, padding: 'var(--space-6) var(--space-8)' }}>
      <h2 style={{ margin: '0 0 var(--space-4)' }}>Settings</h2>
      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <section className="card demo-tools-card">
          <div className="card-kicker">Hackathon demo</div>
          <h3 style={{ margin: 0, fontSize: 24 }}>Get to the good part faster</h3>
          <p className="card-body">
            Faker can populate the profile for a quick walkthrough. The full demo also creates a tailored Ready application so the Chrome extension can fill the local Northstar test site.
          </p>
          <div className="demo-tools-actions">
            <button className="btn btn-secondary" type="button" onClick={showDemoProfile} disabled={demoBusy}>
              Fill fields with Faker
            </button>
            <button className="btn btn-primary" type="button" onClick={createReadyDemo} disabled={demoBusy}>
              {demoBusy ? 'Building demo...' : 'Create Ready demo + open form'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={openDemoForm} disabled={demoBusy}>
              Open blank test form
            </button>
          </div>
          <p className="demo-tools-note">
            Filling fields does not save anything. The full setup writes only clearly labeled synthetic demo records and requires Typst for the PDF.
          </p>
          {demoStatus && <div className="demo-tools-status" role="status">{demoStatus}</div>}
        </section>

        <div>
          <div className="card-kicker">Canonical facts</div>
          <h3 style={{ margin: '3px 0 var(--space-2)', fontSize: 24 }}>Application profile</h3>
          <p className="text-muted" style={{ fontSize: 12 }}>The agent can use every value here. Blank factual fields are always flagged and never inferred.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="field">
              <label>Name</label>
              <input className="input" aria-label="Name" value={profile.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" aria-label="Email" value={profile.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" aria-label="Phone" value={profile.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Location</label>
              <input className="input" aria-label="Location" value={profile.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
            </div>
            <div className="field">
              <label>College</label>
              <input className="input" aria-label="College" value={profile.college ?? ''} onChange={(e) => set({ college: e.target.value })} />
            </div>
            <div className="field">
              <label>Major</label>
              <input className="input" aria-label="Major" value={profile.major ?? ''} onChange={(e) => set({ major: e.target.value })} />
            </div>
            <div className="field">
              <label>Degree</label>
              <input className="input" aria-label="Degree" value={profile.degree ?? ''} onChange={(e) => set({ degree: e.target.value })} />
            </div>
            <div className="field">
              <label>Graduation year</label>
              <input className="input" aria-label="Graduation year" inputMode="numeric" value={profile.graduation_year ?? ''} onChange={(e) => set({ graduation_year: e.target.value })} />
            </div>
            <div className="field">
              <label>Work authorization</label>
              <input className="input" aria-label="Work authorization" placeholder="e.g. Authorized to work in the US" value={profile.work_authorization ?? ''} onChange={(e) => set({ work_authorization: e.target.value })} />
            </div>
            <div className="field">
              <label>Requires sponsorship?</label>
              <select className="input" aria-label="Requires sponsorship?" value={profile.requires_sponsorship ?? ''} onChange={(e) => set({ requires_sponsorship: e.target.value })}>
                <option value="">Not answered</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer_not_to_answer">Prefer not to answer</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <div className="field">
              <label>Preferred roles - comma separated</label>
              <input className="input" aria-label="Preferred roles - comma separated" value={(profile.preferred_roles ?? []).join(', ')} onChange={(e) => set({ preferred_roles: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            </div>
            <div className="field">
              <label>Preferred locations - comma separated</label>
              <input className="input" aria-label="Preferred locations - comma separated" value={(profile.preferred_locations ?? []).join(', ')} onChange={(e) => set({ preferred_locations: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 'var(--space-3)' }}>
            <label>Links - one per line, "Label: url"</label>
            <textarea
              className="input"
              aria-label={'Links - one per line, "Label: url"'}
              style={{ minHeight: 70 }}
              value={links}
              onChange={(e) => {
                setLinks(e.target.value)
                setDirty(true)
              }}
            />
          </div>
          <hr className="hr" />
          <div className="card-kicker">Answer once</div>
          <h4 style={{ margin: '3px 0 var(--space-1)' }}>Application answer bank</h4>
          <p className="text-muted" style={{ fontSize: 12 }}>Use your exact self-identification or a decline choice. ResumeDB never fills these from inference.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {ANSWER_FIELDS.map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  className="input"
                  aria-label={label}
                  placeholder="Answer or prefer not to answer"
                  value={String(profile.application_answers?.[key] ?? '')}
                  onChange={(event) => setAnswer(key, event.target.value)}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary" disabled={!dirty} onClick={save}>
              Save profile
            </button>
            {saved && <span className="text-muted" style={{ fontSize: 13 }}>Saved.</span>}
          </div>
        </div>

        {error && <div style={{ color: 'var(--color-accent-700)', fontSize: 13 }}>{error}</div>}
        <hr className="hr" />

        <ModelSettings provider={health?.agent_provider ?? 'claude'} onError={setError} />
        <hr className="hr" />

        <div>
          <h4 style={{ margin: '0 0 var(--space-2)' }}>Environment</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 14 }}>
            <Row label="Data repository" ok={!!health?.data_repo_ok} value={health?.data_repo ?? '-'} />
            <Row label="Agent provider" ok={true} value={health?.agent_provider ?? 'claude'} />
            {health?.agent_provider === 'codex' ? (
              <Row label="codex CLI" ok={!!health?.codex} value={health?.codex_version ?? 'not found - run: codex login'} />
            ) : (
              <Row label="claude CLI" ok={!!health?.claude} value={health?.claude_version ?? 'not found - run: claude auth login'} />
            )}
            <Row label="typst" ok={!!health?.typst} value={health?.typst ?? 'not found - run: brew install typst'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ModelSettings({ provider, onError }: { provider: string; onError: (e: string) => void }) {
  const [models, setModels] = useState<ModelConfig | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.config().then((c) => setModels(c.models)).catch((e) => onError(e.message))
  }, [onError])

  if (!models) return null
  const modelOptions = provider === 'codex' ? CODEX_MODEL_OPTIONS : CLAUDE_MODEL_OPTIONS

  const set = (key: keyof ModelConfig, value: string) => {
    setModels({ ...models, [key]: value || null })
    setDirty(true)
  }

  const save = async () => {
    try {
      await api.saveConfig({ models })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      onError((e as Error).message)
    }
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 var(--space-1)' }}>Models</h4>
      <p className="text-muted" style={{ fontSize: 12, margin: '0 0 var(--space-3)' }}>
        Defaults per task. "default" uses the configured provider&apos;s CLI default; each chat can also override its model
        from the picker under the message box.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {MODEL_ROWS.map((r) => (
          <div key={r.model} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 190, flex: 'none' }}>
              <div style={{ fontSize: 13 }}>{r.label}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>{r.hint}</div>
            </div>
            <select className="input" style={{ width: 130 }} value={models[r.model] ?? ''} onChange={(e) => set(r.model, e.target.value)}>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m === '' ? 'default' : m}
                </option>
              ))}
            </select>
            <select className="input" style={{ width: 130 }} value={models[r.effort] ?? ''} onChange={(e) => set(r.effort, e.target.value)}>
              {EFFORT_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e === '' ? 'default effort' : e}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-primary" disabled={!dirty} onClick={save}>
          Save models
        </button>
        {saved && <span className="text-muted" style={{ fontSize: 13 }}>Saved.</span>}
      </div>
    </div>
  )
}

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-divider)', padding: '6px 0' }}>
      <span style={{ width: 140, color: 'var(--color-neutral-600)', fontSize: 13 }}>{label}</span>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: ok ? 'var(--color-accent)' : 'var(--color-neutral-400)' }} />
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}
