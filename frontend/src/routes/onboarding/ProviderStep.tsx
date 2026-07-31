import { type AgentProvider, type EnvCheck } from '@/lib/api'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ProviderStep({
  env,
  provider,
  onPick,
  onNext,
}: {
  env: EnvCheck | undefined
  provider: AgentProvider | null
  onPick: (p: AgentProvider) => void
  onNext: (p: AgentProvider) => void
}) {
  const claudeReady = !!env && env.claude.installed && env.claude.authed
  const codexReady = !!env && env.codex.installed
  const selected = provider ?? (claudeReady ? 'claude' : codexReady ? 'codex' : null)

  return (
    <div className="rounded-xl border bg-card p-5">
      <SectionHeader
        title="Choose your agent"
        subtitle="Picked before your data folder is created, so it gets the right rulebook. You can switch later in Settings."
        className="mb-3"
      />
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
