import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Check, CircleAlert, FolderOpen, Loader2, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api, type EnvCheck, type ParsedResume } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Step = 'env' | 'provider' | 'repo' | 'import'
const STEPS: { id: Step; label: string }[] = [
  { id: 'env', label: 'Environment' },
  { id: 'provider', label: 'Provider' },
  { id: 'repo', label: 'Data folder' },
  { id: 'import', label: 'Import' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('env')
  const [provider, setProvider] = useState<'claude' | 'codex' | null>(null)
  const [path, setPath] = useState('')

  const envQ = useQuery({ queryKey: ['env'], queryFn: api.env, staleTime: 10_000 })
  const env = envQ.data

  const finish = async () => {
    await qc.invalidateQueries({ queryKey: ['health'] })
    navigate('/library', { replace: true })
  }

  const stepIdx = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="flex h-screen flex-col items-center overflow-y-auto bg-background px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-2 text-center font-heading text-[34px] font-semibold tracking-tight">ResumeDB</div>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          A career database that tailors itself. Four quick steps.
        </p>

        {/* stepper */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                  i === stepIdx
                    ? 'bg-primary text-primary-foreground'
                    : i < stepIdx
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {i < stepIdx && <Check className="size-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          ))}
        </div>

        {step === 'env' && (
          <EnvStep
            env={env}
            loading={envQ.isFetching}
            onRefresh={() => envQ.refetch()}
            onNext={() => setStep('provider')}
          />
        )}
        {step === 'provider' && (
          <ProviderStep
            env={env}
            provider={provider}
            onPick={setProvider}
            onNext={async (p) => {
              try {
                await api.saveConfig({ agent_provider: p })
                setStep('repo')
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
          />
        )}
        {step === 'repo' && (
          <RepoStep
            defaultPath={env?.data_repo ?? ''}
            path={path}
            setPath={setPath}
            onDone={() => setStep('import')}
          />
        )}
        {step === 'import' && <ImportStep onFinish={finish} />}
      </div>
    </div>
  )
}

function ToolRow({
  name,
  ok,
  detail,
  fix,
}: {
  name: string
  ok: boolean
  detail: string
  fix?: string
}) {
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      {ok ? (
        <Check className="mt-0.5 size-4 flex-none text-emerald-600" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 flex-none text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
        {!ok && fix && <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">{fix}</code>}
      </div>
    </div>
  )
}

function EnvStep({
  env,
  loading,
  onRefresh,
  onNext,
}: {
  env: EnvCheck | undefined
  loading: boolean
  onRefresh: () => void
  onNext: () => void
}) {
  if (!env)
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking your environment…
      </div>
    )

  const claudeReady = env.claude.installed && env.claude.authed
  const anyProvider = claudeReady || env.codex.installed
  const canProceed = anyProvider && env.typst.installed

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-1 font-heading text-lg font-semibold">Environment check</h3>
      <p className="mb-3 text-[13px] text-muted-foreground">
        ResumeDB drives local CLIs - nothing leaves your machine except the agent's own API calls.
      </p>
      <ToolRow
        name="Claude Code"
        ok={claudeReady}
        detail={
          env.claude.installed
            ? env.claude.authed
              ? `${env.claude.version} · signed in`
              : `${env.claude.version} · not signed in`
            : 'not installed'
        }
        fix={env.claude.installed ? 'claude auth login' : 'brew install --cask claude-code'}
      />
      <ToolRow
        name="Codex (optional, experimental)"
        ok={env.codex.installed}
        detail={env.codex.installed ? `${env.codex.version}` : 'not installed - fine if you use Claude'}
      />
      <ToolRow
        name="Typst"
        ok={env.typst.installed}
        detail={env.typst.installed ? `${env.typst.version} · renders your PDFs` : 'required to render PDFs'}
        fix="brew install typst"
      />
      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Re-check
        </Button>
        <Button className="ml-auto" disabled={!canProceed} onClick={onNext}>
          Continue
        </Button>
      </div>
      {!canProceed && (
        <p className="mt-2 text-right text-[11px] text-muted-foreground">
          Install {anyProvider ? '' : 'a provider'}
          {!anyProvider && !env.typst.installed ? ' and ' : ''}
          {env.typst.installed ? '' : 'typst'} to continue.
        </p>
      )}
    </div>
  )
}

function ProviderStep({
  env,
  provider,
  onPick,
  onNext,
}: {
  env: EnvCheck | undefined
  provider: 'claude' | 'codex' | null
  onPick: (p: 'claude' | 'codex') => void
  onNext: (p: 'claude' | 'codex') => void
}) {
  const claudeReady = !!env && env.claude.installed && env.claude.authed
  const codexReady = !!env && env.codex.installed
  const selected = provider ?? (claudeReady ? 'claude' : codexReady ? 'codex' : null)

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-1 font-heading text-lg font-semibold">Choose your agent</h3>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Picked before your data folder is created, so it gets the right rulebook. You can switch later in Settings.
      </p>
      <div className="flex flex-col gap-2">
        {(
          [
            {
              id: 'claude' as const,
              label: 'Claude Code',
              ready: claudeReady,
              hint: claudeReady
                ? 'installed & signed in - recommended'
                : env?.claude.installed
                  ? 'run `claude auth login` first'
                  : 'install Claude Code first',
              experimental: false,
            },
            {
              id: 'codex' as const,
              label: 'Codex',
              ready: codexReady,
              hint: codexReady ? 'installed' : 'install the codex CLI to enable',
              experimental: true,
            },
          ]
        ).map((p) => (
          <button
            key={p.id}
            disabled={!p.ready}
            onClick={() => onPick(p.id)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              selected === p.id && p.ready ? 'border-primary bg-accent' : 'hover:bg-accent/40',
              !p.ready && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {p.label}
              {p.experimental && <Badge variant="outline">experimental</Badge>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{p.hint}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={!selected} onClick={() => selected && onNext(selected)}>
          Continue
        </Button>
      </div>
    </div>
  )
}

function RepoStep({
  defaultPath,
  path,
  setPath,
  onDone,
}: {
  defaultPath: string
  path: string
  setPath: (p: string) => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const effective = path || defaultPath

  const pick = async () => {
    try {
      const { path: picked } = await api.pickFolder()
      if (picked) setPath(picked)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const init = async () => {
    setBusy(true)
    try {
      await api.initDatarepo(effective)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-1 font-heading text-lg font-semibold">Where should your career data live?</h3>
      <p className="mb-3 text-[13px] text-muted-foreground">
        A plain folder of YAML + markdown, versioned with git. Yours forever - readable without this app. Pointing at
        an existing ResumeDB folder adopts it as-is.
      </p>
      <div className="flex gap-2">
        <Input value={effective} onChange={(e) => setPath(e.target.value)} placeholder="/Users/you/resume-data" />
        <Button variant="outline" onClick={pick}>
          <FolderOpen className="size-4" />
          Browse…
        </Button>
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={!effective || busy} onClick={init}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {busy ? 'Setting up…' : 'Create / adopt folder'}
        </Button>
      </div>
    </div>
  )
}

function ImportStep({ onFinish }: { onFinish: () => void }) {
  const [parsing, setParsing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)

  const parse = async (file: File) => {
    setParsing(true)
    try {
      setParsed(await api.importResume(file))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const apply = async () => {
    if (!parsed) return
    setApplying(true)
    try {
      await api.confirmImport(parsed)
      toast.success('Imported into your library')
      onFinish()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-1 font-heading text-lg font-semibold">Seed from your current resume?</h3>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Upload a PDF and the agent converts it into database entries you can refine. Or start fresh - the Library chat
        can interview you instead.
      </p>

      {!parsed ? (
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/30',
            parsing && 'pointer-events-none opacity-60',
          )}
        >
          {parsing ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          {parsing ? 'Parsing your resume with the agent…' : 'Drop your resume PDF here or click to choose'}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) parse(f)
              e.target.value = ''
            }}
          />
        </label>
      ) : (
        <div>
          <div className="mb-2 text-sm">
            Parsed <b>{parsed.entries.length}</b> entries for <b>{parsed.profile.name}</b>:
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border">
            {parsed.entries.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b px-3 py-2 text-[13px] last:border-0">
                <Badge variant="secondary" className="text-[10px]">
                  {e.type}
                </Badge>
                <span className="truncate">
                  {e.title}
                  {e.org ? ` · ${e.org}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setParsed(null)}>
              Re-upload
            </Button>
            <Button onClick={apply} disabled={applying}>
              {applying && <Loader2 className="size-3.5 animate-spin" />}
              Import {parsed.entries.length} entries
            </Button>
          </div>
        </div>
      )}

      {!parsed && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onFinish}>
            Skip & start fresh
          </Button>
        </div>
      )}
    </div>
  )
}
