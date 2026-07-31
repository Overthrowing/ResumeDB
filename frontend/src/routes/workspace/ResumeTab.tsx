import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Application, type RenderResult } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ResumeTab({
  app,
  renderCount,
  lastRender,
  onRender,
  onSaved,
}: {
  app: Application
  renderCount: number
  lastRender: RenderResult | null
  onRender: () => Promise<void>
  onSaved: () => void
}) {
  const [view, setView] = useState<'preview' | 'source'>('preview')
  const [source, setSource] = useState(app.files['resume.yaml'] ?? '')
  const [dirty, setDirty] = useState(false)

  // The agent rewrites resume.yaml behind our back; without this the editor
  // keeps the pre-agent text and "Save & render" would overwrite the tailoring.
  const serverSource = app.files['resume.yaml'] ?? ''
  useEffect(() => {
    if (!dirty) setSource(serverSource)
  }, [serverSource, dirty])

  const saveSource = async () => {
    try {
      await api.saveAppFile(app.meta.id, 'resume.yaml', source)
      setDirty(false)
      onSaved()
      await onRender()
      setView('preview')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">resume.pdf · Typst</Badge>
          {lastRender?.ok && (
            <Badge variant={lastRender.overflow ? 'destructive' : 'default'}>
              {lastRender.pages} page{lastRender.pages === 1 ? '' : 's'}
              {lastRender.overflow ? ' - overflows!' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-1.5">
          {/* h-7 track content + p-0.5 = h-8, matching the size="sm" buttons beside it */}
          <div className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            {(['preview', 'source'] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'flex h-7 items-center rounded-[5px] px-3 text-[13px] transition-colors',
                  view === v
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'preview' ? 'Preview' : 'resume.yaml'}
              </button>
            ))}
          </div>
          {view === 'source' ? (
            <Button variant="secondary" size="sm" disabled={!dirty} onClick={saveSource}>
              Save & render
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onRender}>
              <RefreshCw className="size-3.5" />
              Render
            </Button>
          )}
          <Button variant="secondary" size="sm" asChild>
            <a
              href={`/api/applications/${app.meta.id}/resume.pdf`}
              download={`resume-${app.meta.company.toLowerCase()}.pdf`}
            >
              <Download className="size-3.5" />
              Export
            </a>
          </Button>
        </div>
      </div>

      {view === 'preview' ? (
        app.has_pdf || renderCount > 0 ? (
          <iframe
            key={renderCount}
            title="resume preview"
            src={`/api/applications/${app.meta.id}/resume.pdf#toolbar=0&t=${renderCount}`}
            className="min-h-0 w-full flex-1 rounded-lg border bg-white"
          />
        ) : (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            Not rendered yet - hit Render, or ask the tailoring assistant to draft it.
          </div>
        )
      ) : (
        <textarea
          spellCheck={false}
          className="min-h-0 flex-1 resize-none rounded-lg border bg-card p-3 font-mono text-[12.5px] leading-normal outline-none focus:ring-2 focus:ring-ring/40"
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setDirty(true)
          }}
        />
      )}
    </div>
  )
}
