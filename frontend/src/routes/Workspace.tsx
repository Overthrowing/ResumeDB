import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api, type RenderResult } from '@/lib/api'
import ChatRail from '@/components/ChatRail'
import ErrorText from '@/components/ErrorText'
import StatusPill from '@/components/StatusPill'
import AtsTab from '@/routes/workspace/AtsTab'
import OverviewTab from '@/routes/workspace/OverviewTab'
import ResumeTab from '@/routes/workspace/ResumeTab'
import VersionsTab from '@/routes/workspace/VersionsTab'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = [
  ['overview', 'Overview'],
  ['resume', 'Resume'],
  ['ats', 'ATS check'],
  ['versions', 'Versions'],
] as const

type Tab = (typeof TABS)[number][0]

/** Keying on the id remounts the whole workspace when you navigate straight
 * from one application to another. Several children seed useState on mount only
 * (the chat rail's model choice, the render badge below); reusing the tree let
 * application B inherit application A's. */
export default function Workspace() {
  const { id = '' } = useParams()
  return <ApplicationWorkspace key={id} id={id} />
}

function ApplicationWorkspace({ id }: { id: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('resume')
  const [renderCount, setRenderCount] = useState(0)
  const [lastRender, setLastRender] = useState<RenderResult | null>(null)

  const appQ = useQuery({ queryKey: ['app', id], queryFn: () => api.application(id), enabled: !!id })

  const reload = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['app', id] })
    qc.invalidateQueries({ queryKey: ['apps'] })
  }, [qc, id])

  const render = async () => {
    try {
      const r = await api.render(id)
      setLastRender(r)
      if (r.ok) setRenderCount((n) => n + 1)
      else toast.error(r.stderr.slice(0, 500))
      reload()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onRenderedResult = useCallback((pages: number, ok: boolean) => {
    setLastRender({ ok, pages, overflow: pages > 1, stderr: '' })
    if (ok) setRenderCount((n) => n + 1)
  }, [])

  if (appQ.isPending)
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (appQ.isError)
    return (
      <div className="p-6">
        <ErrorText error={appQ.error} className="mb-3 text-sm" />
        <Button variant="outline" onClick={() => navigate('/applications')}>
          <ChevronLeft className="size-4" /> Back to applications
        </Button>
      </div>
    )

  const app = appQ.data
  const meta = app.meta

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* header */}
      <div className="flex flex-none items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/applications" title="Back to applications" aria-label="Back to applications">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-lg font-semibold">
            {meta.role} · {meta.company}
          </div>
          <div className="text-xs text-muted-foreground">
            {meta.deadline ? `Deadline ${meta.deadline} · ` : ''}reads your Library + memory, writes this
            application's outputs
          </div>
        </div>
        <StatusPill status={meta.status} />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r">
          <div className="flex-none border-b px-4 pt-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList variant="line" className="bg-transparent p-0">
                {TABS.map(([v, label]) => (
                  <TabsTrigger key={v} value={v} className="px-3">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {tab === 'overview' && <OverviewTab app={app} onSaved={reload} />}
            {tab === 'resume' && (
              <ResumeTab app={app} renderCount={renderCount} lastRender={lastRender} onRender={render} onSaved={reload} />
            )}
            {tab === 'ats' && <AtsTab appId={id} />}
            {tab === 'versions' && <VersionsTab appId={id} onReverted={reload} />}
          </div>
        </div>

        <ChatRail
          scope={`app:${id}`}
          title="Tailoring assistant"
          subtitle="Library + memory + this job"
          placeholder="Ask to tailor the resume, tighten bullets, fit one page…"
          onRenderedResult={onRenderedResult}
          onDone={reload}
        />
      </div>
    </div>
  )
}
