import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import ErrorText from '@/components/ErrorText'
import { SectionHeader } from '@/components/Page'
import { Button } from '@/components/ui/button'

export default function VersionsTab({ appId, onReverted }: { appId: string; onReverted: () => void }) {
  const qc = useQueryClient()
  const scope = `app:${appId}`
  const histQ = useQuery({ queryKey: ['history', scope], queryFn: () => api.history(scope) })
  const [diffSha, setDiffSha] = useState<string | null>(null)
  const diffQ = useQuery({
    queryKey: ['diff', diffSha],
    queryFn: () => api.historyDiff(diffSha!),
    enabled: !!diffSha,
  })

  const revert = async (sha: string) => {
    if (!confirm('Revert this checkpoint? A new checkpoint records the undo.')) return
    try {
      await api.revert(sha)
      qc.invalidateQueries({ queryKey: ['history', scope] })
      onReverted()
      toast.success('Reverted')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Versions"
        subtitle="Every change is a git checkpoint scoped to this application. Revert anything."
        className="mb-4"
      />
      <ErrorText error={histQ.error} />
      <div className="flex flex-col">
        {(histQ.data ?? []).map((h) => (
          <div key={h.sha} className="group flex items-center gap-3 border-b py-2.5 text-[13px] last:border-0">
            <span className="text-xs text-muted-foreground">
              {new Date(h.timestamp * 1000).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <span className="min-w-0 flex-1 truncate">{h.subject}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] opacity-0 group-hover:opacity-100"
              onClick={() => setDiffSha(diffSha === h.sha ? null : h.sha)}
            >
              {diffSha === h.sha ? 'Hide diff' : 'Diff'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] opacity-0 group-hover:opacity-100"
              onClick={() => revert(h.sha)}
            >
              <RotateCcw className="size-2.5" />
              Revert
            </Button>
          </div>
        ))}
        {histQ.data?.length === 0 && <div className="py-4 text-sm text-muted-foreground">No checkpoints yet.</div>}
      </div>
      {diffSha && diffQ.data && (
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-normal">
          {diffQ.data}
        </pre>
      )}
    </div>
  )
}
