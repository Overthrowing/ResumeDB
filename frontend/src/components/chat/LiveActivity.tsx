import Markdown from 'react-markdown'
import { ChevronDown } from 'lucide-react'
import ToolBadges from '@/components/chat/ToolBadges'
import { cn } from '@/lib/utils'

/**
 * The in-flight turn: a collapsible activity line over the streaming answer.
 * `open` is owned by the rail so the disclosure survives from one turn to the
 * next, even though this block only exists while a turn is running.
 */
export default function LiveActivity({
  tools,
  thinking,
  streaming,
  open,
  onToggle,
}: {
  tools: string[]
  thinking: string
  streaming: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="w-full max-w-[92%] flex-none self-start">
      <button
        className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
        {tools.length > 0
          ? `${tools[tools.length - 1]} · ${tools.length} tool call${tools.length === 1 ? '' : 's'}`
          : 'Thinking…'}
        <ChevronDown className={cn('size-3 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && tools.length > 0 && <ToolBadges tools={tools} />}
      {open && thinking && (
        <div
          className="mb-1.5 max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-2 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap"
          ref={(el) => el?.scrollTo({ top: el.scrollHeight })}
        >
          {thinking}
        </div>
      )}
      {streaming && (
        <div className="prose-chat text-[13px] leading-relaxed">
          <Markdown>{streaming}</Markdown>
        </div>
      )}
    </div>
  )
}
