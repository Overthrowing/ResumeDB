import { Check, CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { type EnvCheck } from '@/lib/api'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function ToolRow({ name, ok, detail, fix }: { name: string; ok: boolean; detail: string; fix?: string }) {
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

export default function EnvStep({
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
      <SectionHeader
        title="Environment check"
        subtitle="ResumeDB drives local CLIs - nothing leaves your machine except the agent's own API calls."
        className="mb-3"
      />
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
