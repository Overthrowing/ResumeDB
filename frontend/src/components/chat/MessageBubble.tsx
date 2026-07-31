import { useState } from 'react'
import Markdown from 'react-markdown'
import { ChevronDown, RotateCcw, TriangleAlert } from 'lucide-react'
import { type ChatMessage } from '@/lib/api'
import ToolBadges from '@/components/chat/ToolBadges'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** One settled message in the transcript: user echo, error/warning line, or a
 * finished assistant turn with its tool calls and interruption notice. */
export default function MessageBubble({
  m,
  onRetry,
  busy,
}: {
  m: ChatMessage
  onRetry?: () => void
  busy: boolean
}) {
  const [toolsOpen, setToolsOpen] = useState(false)
  if (m.role === 'user')
    return (
      <div className="max-w-[82%] flex-none self-end whitespace-pre-wrap rounded-xl rounded-br-sm border border-primary/20 bg-accent px-3 py-2 text-[13px] leading-normal">
        {m.text}
      </div>
    )
  if (m.role === 'error' || m.role === 'warning')
    return (
      <div className="flex max-w-[92%] flex-none items-start gap-1.5 self-start whitespace-pre-wrap border-l-2 border-destructive pl-2.5 text-xs text-destructive">
        <TriangleAlert className="mt-px size-3 flex-none" />
        {m.text}
      </div>
    )
  return (
    <div className="max-w-[92%] flex-none self-start">
      {m.tools && m.tools.length > 0 && (
        <>
          <button
            className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((o) => !o)}
          >
            {m.tools.length} tool call{m.tools.length === 1 ? '' : 's'}
            <ChevronDown className={cn('size-3 transition-transform', !toolsOpen && '-rotate-90')} />
          </button>
          {toolsOpen && <ToolBadges tools={m.tools} />}
        </>
      )}
      <div className="prose-chat text-[13px] leading-relaxed">
        <Markdown>{m.text}</Markdown>
      </div>
      {m.interrupted && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <TriangleAlert className="size-3 text-destructive" />
          Turn interrupted (backend restarted); partial output above.
          {onRetry && (
            <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[11px]" disabled={busy} onClick={onRetry}>
              <RotateCcw className="size-2.5" />
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
