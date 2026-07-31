import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type ModelConfig, type Profile } from '@/lib/api'
import ErrorText from '@/components/ErrorText'
import { Page, PageHeader, SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { MODELS, modelLabel, resolveModel, type ModelKind } from '@/lib/models'
import { cn } from '@/lib/utils'

const EFFORTS = ['', 'low', 'medium', 'high', 'xhigh', 'max']

function ModelRow({
  label,
  hint,
  kind,
  model,
  effort,
  onChange,
}: {
  label: string
  hint: string
  kind: ModelKind
  model: string | null
  effort: string | null
  onChange: (model: string, effort: string | null) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-40 flex-none">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <Select value={resolveModel(model, kind)} onValueChange={(v) => onChange(v, effort)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((m) => (
            <SelectItem key={m} value={m}>
              {modelLabel(m, kind)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={effort ?? 'default'}
        onValueChange={(v) => onChange(resolveModel(model, kind), v === 'default' ? null : v)}
      >
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EFFORTS.map((e) => (
            <SelectItem key={e || 'default'} value={e || 'default'}>
              {e || 'default effort'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const configQ = useQuery({ queryKey: ['config'], queryFn: api.config })
  const healthQ = useQuery({ queryKey: ['health'], queryFn: api.health })
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: api.profile })

  // Rendering the form on a failed profile fetch would show empty fields, and
  // saving those would wipe the real profile.
  const loadError = configQ.error ?? profileQ.error
  if (loadError) return <ErrorText error={loadError} className="p-6 text-sm" />
  const config = configQ.data
  if (!config || !profileQ.data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Profile, provider, models, and data repo." />
      <div className="flex max-w-xl flex-col gap-8 pb-12">
        <ProfileSection profile={profileQ.data} onSaved={() => qc.invalidateQueries({ queryKey: ['profile'] })} />
        <Separator />
        <ProviderSection
          config={config}
          claudeAvailable={!!healthQ.data?.claude}
          codexAvailable={!!healthQ.data?.codex}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['config'] })
            qc.invalidateQueries({ queryKey: ['health'] })
          }}
        />
        <Separator />
        <ModelsSection config={config} onSaved={() => qc.invalidateQueries({ queryKey: ['config'] })} />
        <Separator />
        <RepoSection dataRepo={config.data_repo} />
      </div>
    </Page>
  )
}

function ProfileSection({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [dirty, setDirty] = useState(false)
  const set = (patch: Partial<Profile>) => {
    setDraft({ ...draft, ...patch })
    setDirty(true)
  }
  const links = draft.links ?? []

  const save = async () => {
    try {
      await api.saveProfile(draft)
      setDirty(false)
      onSaved()
      toast.success('Profile saved')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <section>
      <SectionHeader title="Profile" className="mb-3" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={draft.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={draft.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={draft.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Location">
          <Input value={draft.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
        </Field>
      </div>
      <div className="mt-3">
        <Label className="mb-1.5 text-xs">Links</Label>
        <div className="flex flex-col gap-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input
                className="w-32"
                placeholder="label"
                value={l.label}
                onChange={(e) => set({ links: links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
              />
              <Input
                placeholder="https://…"
                value={l.url}
                onChange={(e) => set({ links: links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
              />
              <Button variant="ghost" size="icon-sm" onClick={() => set({ links: links.filter((_, j) => j !== i) })}>
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => set({ links: [...links, { label: '', url: '' }] })}
          >
            <Plus className="size-3.5" />
            Add link
          </Button>
        </div>
      </div>
      <Button className="mt-4" disabled={!dirty} onClick={save}>
        Save profile
      </Button>
    </section>
  )
}

function ProviderSection({
  config,
  claudeAvailable,
  codexAvailable,
  onSaved,
}: {
  config: { agent_provider: 'claude' | 'codex'; claude_bin: string | null; codex_bin: string | null }
  claudeAvailable: boolean
  codexAvailable: boolean
  onSaved: () => void
}) {
  const setProvider = async (provider: 'claude' | 'codex') => {
    try {
      await api.saveConfig({ agent_provider: provider })
      onSaved()
      toast.success(`Provider set to ${provider}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Agent provider"
        subtitle="Which CLI runs your tailoring and chat turns."
        className="mb-3"
      />
      <div className="flex gap-3">
        {(
          [
            {
              id: 'claude',
              label: 'Claude Code',
              available: claudeAvailable,
              hint: 'brew install claude, then claude auth login',
            },
            { id: 'codex', label: 'Codex', available: codexAvailable, hint: 'install the codex CLI to enable' },
          ] as const
        ).map((p) => (
          <button
            key={p.id}
            disabled={!p.available}
            onClick={() => setProvider(p.id)}
            className={cn(
              'flex-1 rounded-lg border p-3 text-left transition-colors',
              config.agent_provider === p.id ? 'border-primary bg-accent' : 'hover:bg-accent/40',
              !p.available && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {p.label}
              {p.id === 'codex' && <Badge variant="outline">experimental</Badge>}
              {config.agent_provider === p.id && <Badge>active</Badge>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {p.available ? 'installed' : p.hint}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function ModelsSection({
  config,
  onSaved,
}: {
  config: { models: ModelConfig }
  onSaved: () => void
}) {
  // A config written before per-task defaults existed stores null for a model.
  // Resolve those up front so what the dropdown shows is what a save writes.
  const [models, setModels] = useState<ModelConfig>(() => ({
    ...config.models,
    chat: resolveModel(config.models.chat, 'chat'),
    tailor: resolveModel(config.models.tailor, 'tailor'),
    audit: resolveModel(config.models.audit, 'audit'),
    jd: resolveModel(config.models.jd, 'jd'),
  }))
  const [dirty, setDirty] = useState(false)

  const change = (patch: Partial<ModelConfig>) => {
    setModels({ ...models, ...patch })
    setDirty(true)
  }

  const save = async () => {
    try {
      // Effort still has a "default effort" option, which the API spells null.
      const norm = Object.fromEntries(
        Object.entries(models).map(([k, v]) => [k, v === 'default' || v === '' ? null : v]),
      ) as unknown as ModelConfig
      await api.saveConfig({ models: norm })
      setDirty(false)
      onSaved()
      toast.success('Models saved')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <section>
      <SectionHeader
        title="Models"
        subtitle="Per-task model and reasoning effort. Each task's recommended model is marked default."
        className="mb-2"
      />
      <ModelRow
        label="Chat"
        hint="Library & pipeline chats"
        kind="chat"
        model={models.chat}
        effort={models.chat_effort}
        onChange={(m, e) => change({ chat: m, chat_effort: e })}
      />
      <ModelRow
        label="Tailoring"
        hint="Rewrites your resume"
        kind="tailor"
        model={models.tailor}
        effort={models.tailor_effort}
        onChange={(m, e) => change({ tailor: m, tailor_effort: e })}
      />
      <ModelRow
        label="ATS audit"
        hint="Keyword rubric"
        kind="audit"
        model={models.audit}
        effort={models.audit_effort}
        onChange={(m, e) => change({ audit: m, audit_effort: e })}
      />
      <ModelRow
        label="JD fetch"
        hint="Job posting from a link"
        kind="jd"
        model={models.jd}
        effort={models.jd_effort}
        onChange={(m, e) => change({ jd: m, jd_effort: e })}
      />
      <Button className="mt-3" disabled={!dirty} onClick={save}>
        Save models
      </Button>
    </section>
  )
}

function RepoSection({ dataRepo }: { dataRepo: string }) {
  return (
    <section>
      <SectionHeader
        title="Data repo"
        subtitle="Your career database - a plain git repo you own. Changing it re-runs onboarding."
        className="mb-2"
      />
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-xs">{dataRepo}</code>
        <Button variant="outline" size="sm" asChild>
          <a href="/onboarding">Change…</a>
        </Button>
      </div>
    </section>
  )
}
