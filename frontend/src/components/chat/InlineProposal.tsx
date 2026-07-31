import { Check, Plus, TriangleAlert } from 'lucide-react'
import { type Proposal } from '@/lib/api'
import { Button } from '@/components/ui/button'

/** A pending proposals/<name>.yaml, accepted or discarded from the transcript. */
export default function InlineProposal({
  p,
  onResolve,
}: {
  p: Proposal
  onResolve: (name: string, approve: boolean) => void
}) {
  const d = p.data as { type?: string; title?: string; org?: string; bullets?: string[] }
  return (
    <div className="flex-none overflow-hidden rounded-lg border border-primary/30 bg-card">
      <div className="flex items-center gap-1.5 border-b border-primary/20 bg-accent px-3 py-1.5 font-heading text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
        {p.error ? <TriangleAlert className="size-3" /> : <Plus className="size-3" />}
        Proposed · {p.error ? 'unreadable' : (d.type ?? 'entry')}
      </div>
      <div className="p-3">
        {p.error ? (
          <>
            <div className="mb-1 text-[13px]">
              <b>{p.name}</b> could not be parsed:
            </div>
            <div className="whitespace-pre-wrap text-xs text-destructive">{p.error}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Ask the assistant to rewrite proposals/{p.name}.yaml as valid YAML, or discard it.
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 text-xs text-muted-foreground">
              Add to → <span className="text-foreground">{p.target ?? 'unknown target'}</span>
            </div>
            <div className="border-l-2 border-primary pl-2.5 text-[13px] leading-normal">
              <b>{d.title}</b>
              {d.org ? ` · ${d.org}` : ''}
              {(d.bullets ?? []).map((b, i) => (
                <div key={i}>- {b}</div>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex gap-2">
          {!p.error && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onResolve(p.name, true)}>
              <Check className="size-3" />
              Accept
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => onResolve(p.name, false)}
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  )
}
